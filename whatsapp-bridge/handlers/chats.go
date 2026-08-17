package handlers

import (
	"log"
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/appstate"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
)

// Chat is the response shape for the chats endpoint.
type Chat struct {
	ID                   string `json:"id"`
	Name                 string `json:"name"`
	IsArchived           bool   `json:"isArchived"`
	IsGroup              bool   `json:"isGroup"`
	LastMessageTimestamp string `json:"lastMessageTimestamp"`
}

// ChatRow mirrors the SQL projection used to build a Chat.
type ChatRow struct {
	ChatJID            string
	LastMsgTs          string
	Archived           bool
	LidPN              string
	PNLid              string
	GroupName          string
	DirectFirstName    string
	DirectFullName     string
	DirectBusinessName string
	LidFirstName       string
	LidFullName        string
	LidBusinessName    string
	PNFirstName        string
	PNFullName         string
	PNBusinessName     string
}

// HandleArchiveEvent handles an incoming archive event from WhatsApp.
func HandleArchiveEvent(ctx context.Context, db *sql.DB, client *whatsmeow.Client, evt *events.Archive) error {
	ourJID := client.Store.GetJID().String()
	archived := false
	if evt.Action != nil {
		archived = evt.Action.GetArchived()
	}
	return setChatArchived(ctx, db, ourJID, evt.JID.String(), archived)
}

// HandleAppStateSyncCompleteEvent handles an incoming app-state-sync-complete event.
func HandleAppStateSyncCompleteEvent(ctx context.Context, db *sql.DB, client *whatsmeow.Client, evt *events.AppStateSyncComplete) {
	if evt.Name != appstate.WAPatchRegularLow {
		return
	}
	ourJID := client.Store.GetJID().String()
	rows, err := db.QueryContext(ctx, "SELECT chat_jid FROM whatsmeow_chats WHERE our_jid = $1", ourJID)
	if err != nil {
		log.Printf("[error] app state sync complete: query chats: %v", err)
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
			log.Printf("[error] app state sync complete: update archived for %s: %v", chatJID, err)
		}
	}
	if err := rows.Err(); err != nil {
		log.Printf("[error] app state sync complete: scan chats: %v", err)
	}
}

// ArchiveChatRequest handles an archive/unarchive request from the HTTP server.
func ArchiveChatRequest(ctx context.Context, client *whatsmeow.Client, id string, archived bool) error {
	if id == "" {
		return fmt.Errorf("archive_chat: missing 'id'")
	}
	jid, err := types.ParseJID(id)
	if err != nil {
		return fmt.Errorf("archive_chat: %w", err)
	}
	if err := client.SendAppState(ctx, appstate.BuildArchive(jid, archived, time.Now(), nil)); err != nil {
		return fmt.Errorf("archive_chat: %w", err)
	}
	action := "archived"
	if !archived {
		action = "unarchived"
	}
	log.Printf("[debug] chat %s %s", id, action)
	return nil
}

// MarkChatReadRequest handles a mark-chat-read request from the HTTP server.
func MarkChatReadRequest(ctx context.Context, client *whatsmeow.Client, chatID string) error {
	if chatID == "" {
		return fmt.Errorf("mark_chat_read: missing 'id'")
	}
	jid, err := types.ParseJID(chatID)
	if err != nil {
		return fmt.Errorf("mark_chat_read: %w", err)
	}
	if err := client.MarkRead(ctx, nil, time.Now(), jid, jid); err != nil {
		return fmt.Errorf("mark_chat_read: %w", err)
	}
	log.Printf("[debug] chat %s marked as read", chatID)
	return nil
}

// GetChatsRequest handles a get-chats request from the HTTP server.
func GetChatsRequest(ctx context.Context, db *sql.DB, ourJID string) ([]Chat, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT
			c.chat_jid,
			TO_CHAR(c.last_message_ts AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS last_msg_ts,
			c.archived,
			COALESCE(lm.pn || '@s.whatsapp.net', '') AS lid_pn,
			COALESCE(lm2.lid || '@lid', '') AS pn_lid,
			COALESCE(g.group_name, '') AS group_name,
			COALESCE(co_direct.first_name, '') AS direct_first_name,
			COALESCE(co_direct.full_name, '') AS direct_full_name,
			COALESCE(co_direct.business_name, '') AS direct_business_name,
			COALESCE(co_via_lid.first_name, '') AS lid_first_name,
			COALESCE(co_via_lid.full_name, '') AS lid_full_name,
			COALESCE(co_via_lid.business_name, '') AS lid_business_name,
			COALESCE(co_via_pn.first_name, '') AS pn_first_name,
			COALESCE(co_via_pn.full_name, '') AS pn_full_name,
			COALESCE(co_via_pn.business_name, '') AS pn_business_name
		FROM whatsmeow_chats c
		LEFT JOIN whatsmeow_lid_map lm ON lm.lid = replace(c.chat_jid, '@lid', '')
		LEFT JOIN whatsmeow_lid_map lm2 ON lm2.pn = replace(c.chat_jid, '@s.whatsapp.net', '')
		LEFT JOIN whatsmeow_groups g ON g.group_jid = c.chat_jid AND g.our_jid = $1
		LEFT JOIN whatsmeow_contacts co_direct ON co_direct.their_jid = c.chat_jid AND co_direct.our_jid = $1
		LEFT JOIN whatsmeow_contacts co_via_lid ON co_via_lid.their_jid = lm.pn || '@s.whatsapp.net' AND co_via_lid.our_jid = $1
		LEFT JOIN whatsmeow_contacts co_via_pn ON co_via_pn.their_jid = lm2.lid || '@lid' AND co_via_pn.our_jid = $1
		WHERE c.our_jid = $1 AND c.last_message_ts > NOW() - INTERVAL '1 year' AND c.chat_jid != 'status@broadcast'
		ORDER BY c.last_message_ts DESC`,
		ourJID,
	)
	if err != nil {
		return nil, fmt.Errorf("query chats: %w", err)
	}
	defer rows.Close()

	var chats []Chat
	for rows.Next() {
		var r ChatRow
		if err := rows.Scan(
			&r.ChatJID,
			&r.LastMsgTs,
			&r.Archived,
			&r.LidPN,
			&r.PNLid,
			&r.GroupName,
			&r.DirectFirstName,
			&r.DirectFullName,
			&r.DirectBusinessName,
			&r.LidFirstName,
			&r.LidFullName,
			&r.LidBusinessName,
			&r.PNFirstName,
			&r.PNFullName,
			&r.PNBusinessName,
		); err != nil {
			return nil, fmt.Errorf("scan chat: %w", err)
		}
		chats = append(chats, Chat{
			ID:                   r.ChatJID,
			Name:                 chatName(r),
			IsArchived:           r.Archived,
			IsGroup:              strings.HasSuffix(r.ChatJID, "@g.us"),
			LastMessageTimestamp: r.LastMsgTs,
		})
	}
	return chats, rows.Err()
}

func setChatArchived(ctx context.Context, db *sql.DB, ourJID, chatJID string, archived bool) error {
	_, err := db.ExecContext(ctx,
		"UPDATE whatsmeow_chats SET archived = $1 WHERE our_jid = $2 AND chat_jid = $3",
		archived, ourJID, chatJID)
	if err != nil {
		return err
	}
	if strings.HasSuffix(chatJID, "@lid") {
		lid := strings.TrimSuffix(chatJID, "@lid")
		_, err = db.ExecContext(ctx,
			"UPDATE whatsmeow_chats SET archived = $1 WHERE our_jid = $2 AND chat_jid = (SELECT pn || '@s.whatsapp.net' FROM whatsmeow_lid_map WHERE lid = $3)",
			archived, ourJID, lid)
		if err != nil {
			return err
		}
	}
	if strings.HasSuffix(chatJID, "@s.whatsapp.net") {
		pn := strings.TrimSuffix(chatJID, "@s.whatsapp.net")
		_, err = db.ExecContext(ctx,
			"UPDATE whatsmeow_chats SET archived = $1 WHERE our_jid = $2 AND chat_jid = (SELECT lid || '@lid' FROM whatsmeow_lid_map WHERE pn = $3)",
			archived, ourJID, pn)
		if err != nil {
			return err
		}
	}
	return nil
}

func chatName(row ChatRow) string {
	if strings.HasSuffix(row.ChatJID, "@g.us") {
		if row.GroupName != "" {
			return row.GroupName
		}
		return row.ChatJID
	}

	if direct := pickName(row.DirectFullName, row.DirectFirstName, row.DirectBusinessName); direct != "" {
		return direct
	}

	if strings.HasSuffix(row.ChatJID, "@lid") {
		if lid := pickName(row.LidFullName, row.LidFirstName, row.LidBusinessName); lid != "" {
			return lid
		}
		if row.LidPN != "" {
			return formatPhoneNumber(strings.TrimSuffix(row.LidPN, "@s.whatsapp.net"))
		}
		return row.ChatJID
	}

	if strings.HasSuffix(row.ChatJID, "@s.whatsapp.net") {
		if pn := pickName(row.PNFullName, row.PNFirstName, row.PNBusinessName); pn != "" {
			return pn
		}
		return formatPhoneNumber(strings.Split(row.ChatJID, "@")[0])
	}

	return row.ChatJID
}

func pickName(fullName, firstName, businessName string) string {
	if fullName != "" {
		return fullName
	}
	if firstName != "" {
		return firstName
	}
	if businessName != "" {
		return businessName
	}
	return ""
}

func formatPhoneNumber(raw string) string {
	if raw == "" {
		return ""
	}
	if strings.HasPrefix(raw, "+") {
		return raw
	}
	if strings.HasPrefix(raw, "41") && len(raw) == 11 {
		national := raw[2:]
		return "+41 " + national[:2] + " " + national[2:5] + " " + national[5:7] + " " + national[7:9]
	}
	if len(raw) >= 3 {
		return "+" + raw[:2] + " " + raw[2:]
	}
	return "+" + raw
}
