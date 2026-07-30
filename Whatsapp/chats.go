package main

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/appstate"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
)

func handleArchive(ctx context.Context, db *sql.DB, client *whatsmeow.Client, evt *events.Archive) error {
	ourJID := client.Store.GetJID().String()
	archived := false
	if evt.Action != nil {
		archived = evt.Action.GetArchived()
	}
	return setChatArchived(ctx, db, ourJID, evt.JID.String(), archived)
}

func handleAppStateSyncComplete(ctx context.Context, db *sql.DB, client *whatsmeow.Client, evt *events.AppStateSyncComplete) {
	if evt.Name != appstate.WAPatchRegularLow {
		return
	}
	ourJID := client.Store.GetJID().String()
	rows, err := db.QueryContext(ctx, "SELECT chat_jid FROM whatsapp_chats WHERE our_jid = $1", ourJID)
	if err != nil {
		emitError(fmt.Errorf("app state sync complete: query chats: %w", err))
		return
	}
	defer rows.Close()
	for rows.Next() {
		var chatJID string
		if err := rows.Scan(&chatJID); err != nil {
			continue
		}
		jid, err := types.ParseJID(chatJID)
		if err != nil {
			continue
		}
		settings, err := client.Store.ChatSettings.GetChatSettings(ctx, jid)
		if err != nil {
			continue
		}
		if !settings.Found {
			continue
		}
		if err := setChatArchived(ctx, db, ourJID, chatJID, settings.Archived); err != nil {
			emitError(fmt.Errorf("app state sync complete: update archived for %s: %w", chatJID, err))
		}
	}
	if err := rows.Err(); err != nil {
		emitError(fmt.Errorf("app state sync complete: scan chats: %w", err))
	}
}

func setChatArchived(ctx context.Context, db *sql.DB, ourJID, chatJID string, archived bool) error {
	_, err := db.ExecContext(ctx,
		"UPDATE whatsapp_chats SET archived = $1 WHERE our_jid = $2 AND chat_jid = $3",
		archived, ourJID, chatJID)
	if err != nil {
		return err
	}
	if strings.HasSuffix(chatJID, "@lid") {
		lid := strings.TrimSuffix(chatJID, "@lid")
		_, err = db.ExecContext(ctx,
			"UPDATE whatsapp_chats SET archived = $1 WHERE our_jid = $2 AND chat_jid = (SELECT pn || '@s.whatsapp.net' FROM whatsmeow_lid_map WHERE lid = $3)",
			archived, ourJID, lid)
		if err != nil {
			return err
		}
	}
	if strings.HasSuffix(chatJID, "@s.whatsapp.net") {
		pn := strings.TrimSuffix(chatJID, "@s.whatsapp.net")
		_, err = db.ExecContext(ctx,
			"UPDATE whatsapp_chats SET archived = $1 WHERE our_jid = $2 AND chat_jid = (SELECT lid || '@lid' FROM whatsmeow_lid_map WHERE pn = $3)",
			archived, ourJID, pn)
		if err != nil {
			return err
		}
	}
	return nil
}
