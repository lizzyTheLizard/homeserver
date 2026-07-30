// Command whatsapp is a small bridge process that connects a WhatsApp account
// (via whatsmeow) to a controlling parent process over stdin/stdout.
//
// Usage:
//
//	whatsapp <user-email> <postgres-connection-string> <dev>
//
// The user-email identifies the application user (e.g. user@example.com). The
// whatsapp_users table maps it to the WhatsApp device JID used for session
// management. If no mapping exists, a new session is created and a QR code is
// emitted on stdout for pairing. The dev flag (true/false) selects the device
// name shown in WhatsApp's linked devices list: "Gutschi.Site (dev)" in dev,
// "Gutschi.Site" otherwise.
//
// Commands are read as JSON lines from stdin, events are written as JSON lines
// to stdout. Nothing else is written to stdout, so the parent process can
// safely parse the event stream. All logging is suppressed.
//
// All received messages (live and history sync) are stored in the
// whatsapp_messages table, which is created at startup.
package main

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"os/signal"
	"strconv"

	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/appstate"
	"go.mau.fi/whatsmeow/store"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	waLog "go.mau.fi/whatsmeow/util/log"

	// Registers the "pgx" database/sql driver used by the whatsmeow store.
	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	if len(os.Args) != 4 {
		fmt.Fprintf(os.Stderr, "usage: %s <user-id> <postgres-connection-string> <dev>\n", os.Args[0])
		os.Exit(2)
	}

	dev, err := strconv.ParseBool(os.Args[3])
	if err != nil {
		fmt.Fprintf(os.Stderr, "invalid dev flag %q: must be true or false\n", os.Args[3])
		os.Exit(2)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()

	if err := run(ctx, os.Args[1], os.Args[2], dev); err != nil {
		emitError(err)
		os.Exit(1)
	}
}

func run(ctx context.Context, userID, connString string, dev bool) error {
	db, err := sql.Open("pgx", connString)
	if err != nil {
		return fmt.Errorf("open database: %w", err)
	}

	container := sqlstore.NewWithDB(db, "pgx", waLog.Noop)
	if err := container.Upgrade(ctx); err != nil {
		db.Close()
		return fmt.Errorf("upgrade whatsmeow database: %w", err)
	}
	defer container.Close()
	emitLog("debug", "whatsmeow database schema synced")

	device, err := getDevice(ctx, container, db, userID)
	if err != nil {
		return err
	}

	setClientName(dev)
	client := whatsmeow.NewClient(device, waLog.Noop)
	client.AddEventHandler(func(evt any) { handleEvent(ctx, client, db, userID, evt) })

	// The QR channel must be opened before Connect.
	var qrChan <-chan whatsmeow.QRChannelItem
	if client.Store.ID == nil {
		emitLog("info", "new device, waiting for QR pairing")
		qrChan, err = client.GetQRChannel(ctx)
		if err != nil {
			return fmt.Errorf("open QR channel: %w", err)
		}
	} else {
		emitLog("debug", "existing device, reconnecting")
	}

	if err := client.Connect(); err != nil {
		return fmt.Errorf("connect to WhatsApp: %w", err)
	}

	if qrChan != nil {
		go handleQRChannel(qrChan)
	}

	// Blocks until stdin is closed by the parent process or shutdown is signaled.
	readCommands(ctx, client, db)

	client.Disconnect()
	emitLog("info", "disconnected")
	return nil
}

func getDevice(ctx context.Context, container *sqlstore.Container, db *sql.DB, userID string) (*store.Device, error) {
	deviceIDStr, err := getDeviceID(ctx, db, userID)
	if err != nil {
		return nil, fmt.Errorf("lookup device for %s: %w", userID, err)
	}

	var device *store.Device
	if deviceIDStr != "" {
		jid, err := types.ParseJID(deviceIDStr)
		if err != nil {
			return nil, fmt.Errorf("parse device JID %q: %w", deviceIDStr, err)
		}
		device, err = container.GetDevice(ctx, jid)
		if err != nil {
			return nil, fmt.Errorf("load device %s: %w", deviceIDStr, err)
		}
	}
	if device == nil {
		device = container.NewDevice()
	}
	return device, nil
}

func setClientName(dev bool) {
	name := "Gutschi.Site"
	if dev {
		name = "Gutschi.Site (dev)"
	}
	store.SetOSInfo(name, [3]uint32{1, 0, 0})
}

func handleEvent(ctx context.Context, client *whatsmeow.Client, db *sql.DB, userID string, evt any) {
	switch evt := evt.(type) {
	case *events.Connected:
		if client.Store.ID == nil {
			emitError(fmt.Errorf("client.Store.ID is nil after connected event"))
			return
		}
		connectedUser := client.Store.ID.String()
		if err := saveDeviceID(ctx, db, userID, connectedUser); err != nil {
			emitError(fmt.Errorf("save device mapping: %w", err))
		} else {
			emitLog("debug", fmt.Sprintf("device mapping saved for %s", connectedUser))
		}
		if err := client.FetchAppState(ctx, appstate.WAPatchRegularLow, false, false); err != nil {
			emitError(fmt.Errorf("fetch app state: %w", err))
		} else {
			emitLog("debug", "initial app state fetched")
		}
		emitEvent(Event{Type: EventConnectionEstablished, UserID: connectedUser})
	case *events.Message:
		ourJID := client.Store.GetJID().String()
		if err := handleMessage(ctx, db, client, ourJID, evt); err != nil {
			emitError(err)
		} else {
			emitLog("debug", fmt.Sprintf("message %s stored", evt.Info.ID))
		}
	case *events.GroupInfo:
		handleGroupInfo(ctx, db, client.Store.GetJID().String(), evt)
	case *events.JoinedGroup:
		handleJoinedGroup(ctx, db, client.Store.GetJID().String(), evt)
	case *events.HistorySync:
		ourJID := client.Store.GetJID().String()
		if err := handleHistorySyncMessages(ctx, db, client, ourJID, evt.Data); err != nil {
			emitError(fmt.Errorf("store history sync: %w", err))
		}
		handleHistorySyncGroups(ctx, db, ourJID, evt.Data)
	case *events.PairError:
		emitError(fmt.Errorf("pairing failed: %w", evt.Error))
	case *events.Archive:
		if err := handleArchive(ctx, db, client, evt); err != nil {
			emitError(fmt.Errorf("handle archive: %w", err))
		}
	case *events.AppStateSyncComplete:
		handleAppStateSyncComplete(ctx, db, client, evt)
	case *events.LoggedOut:
		emitLog("warn", fmt.Sprintf("logged out (reason %d)", evt.Reason))
		emitEvent(Event{Type: EventLoggedOut, Message: fmt.Sprintf("%d", evt.Reason)})
		client.Disconnect()
	}
}

func handleQRChannel(qrChan <-chan whatsmeow.QRChannelItem) {
	for item := range qrChan {
		switch item.Event {
		case whatsmeow.QRChannelEventCode:
			emitEvent(Event{Type: EventQRCode, QR: item.Code})
		case whatsmeow.QRChannelEventError:
			emitError(item.Error)
		case whatsmeow.QRChannelSuccess.Event:
			emitLog("info", "QR pairing succeeded")
		case whatsmeow.QRChannelTimeout.Event:
			emitError(fmt.Errorf("QR pairing timed out"))
		default:
			emitError(fmt.Errorf("QR pairing failed: %s", item.Event))
		}
	}
}
