package main

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/proto/waE2E"
	"go.mau.fi/whatsmeow/proto/waHistorySync"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	"google.golang.org/protobuf/proto"
)

// execer is satisfied by both *sql.DB and *sql.Tx.
type execer interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
}

const messagesSchema = `
CREATE TABLE IF NOT EXISTS whatsmeow_messages (
	our_jid    TEXT        NOT NULL,
	chat_jid   TEXT        NOT NULL,
	sender_jid TEXT        NOT NULL,
	id         TEXT        NOT NULL,
	ts         TIMESTAMPTZ NOT NULL,
	type       TEXT        NOT NULL,
	text       TEXT,
	from_me    BOOLEAN     NOT NULL,
	raw        BYTEA,
	PRIMARY KEY (our_jid, chat_jid, id)
)`

func initializeMessagesDb(ctx context.Context, db *sql.DB) error {
	if _, err := db.ExecContext(ctx, messagesSchema); err != nil {
		return fmt.Errorf("create whatsmeow_messages table: %w", err)
	}
	return nil
}

const insertMessagePrefix = `
INSERT INTO whatsmeow_messages (our_jid, chat_jid, sender_jid, id, ts, type, text, from_me, raw)
VALUES `

const insertMessageSuffix = ` ON CONFLICT (our_jid, chat_jid, id) DO NOTHING`

// insertBatchSize limits how many messages are stored per INSERT statement.
// Batching avoids one database round-trip per message during history sync,
// which otherwise dominates the sync time.
const insertBatchSize = 500

// save stores a single message event.
func save(ctx context.Context, db *sql.DB, ourJID string, evt *events.Message) error {
	return insertMessages(ctx, db, ourJID, []*events.Message{evt})
}

// saveHistorySyncMessages parses and stores all messages contained in a history sync
// blob. Messages that cannot be parsed are skipped, so one broken message does
// not abort the whole sync.
func saveHistorySyncMessages(ctx context.Context, db *sql.DB, client *whatsmeow.Client, ourJID string, data *waHistorySync.HistorySync) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback()

	var batch []*events.Message
	for _, conv := range data.GetConversations() {
		chatJID, err := types.ParseJID(conv.GetID())
		if err != nil {
			continue
		}
		for _, historyMsg := range conv.GetMessages() {
			if historyMsg.GetMessage() == nil {
				continue
			}
			evt, err := client.ParseWebMessage(chatJID, historyMsg.GetMessage())
			if err != nil {
				continue
			}
			if messageType(evt) == "text" && messageText(evt.Message) == "" {
				continue
			}
			batch = append(batch, evt)
			if len(batch) >= insertBatchSize {
				if err := insertMessages(ctx, tx, ourJID, batch); err != nil {
					return fmt.Errorf("insert history messages: %w", err)
				}
				batch = batch[:0]
			}
		}
	}
	if err := insertMessages(ctx, tx, ourJID, batch); err != nil {
		return fmt.Errorf("insert history messages: %w", err)
	}
	return tx.Commit()
}

// insertMessages stores message events with one multi-row INSERT, so a
// history sync does not need one database round-trip per message.
func insertMessages(ctx context.Context, ex execer, ourJID string, evts []*events.Message) error {
	query, args := buildInsertQuery(ourJID, evts)
	if query == "" {
		return nil
	}
	_, err := ex.ExecContext(ctx, query, args...)
	return err
}

// buildInsertQuery builds a multi-row INSERT ... ON CONFLICT DO NOTHING for
// the given messages. Messages without an id or content are skipped. It
// returns an empty query when there is nothing to store.
func buildInsertQuery(ourJID string, evts []*events.Message) (string, []any) {
	var query strings.Builder
	var args []any
	for _, evt := range evts {
		if evt.Info.ID == "" || evt.Message == nil {
			continue
		}
		if len(args) == 0 {
			query.WriteString(insertMessagePrefix)
		} else {
			query.WriteByte(',')
		}
		n := len(args)
		fmt.Fprintf(&query, "($%d,$%d,$%d,$%d,$%d,$%d,$%d,$%d,$%d)", n+1, n+2, n+3, n+4, n+5, n+6, n+7, n+8, n+9)
		args = append(args, messageArgs(ourJID, evt)...)
	}
	if len(args) == 0 {
		return "", nil
	}
	query.WriteString(insertMessageSuffix)
	return query.String(), args
}

// messageArgs returns the column values of a single message.
func messageArgs(ourJID string, evt *events.Message) []any {
	return []any{
		ourJID,
		evt.Info.Chat.String(),
		evt.Info.Sender.String(),
		string(evt.Info.ID),
		evt.Info.Timestamp,
		messageType(evt),
		nilIfEmpty(messageText(evt.Message)),
		evt.Info.IsFromMe,
		rawMessage(evt.Message),
	}
}

// messageType returns the message category. Live messages carry the type set by
// the server; for history sync messages it is derived from the content.
func messageType(evt *events.Message) string {
	if evt.Info.Type != "" {
		return evt.Info.Type
	}
	switch m := evt.Message; {
	case m == nil:
		return "unknown"
	case m.Conversation != nil || m.ExtendedTextMessage != nil:
		return "text"
	case m.ImageMessage != nil:
		return "image"
	case m.VideoMessage != nil:
		return "video"
	case m.AudioMessage != nil:
		return "audio"
	case m.DocumentMessage != nil:
		return "document"
	case m.StickerMessage != nil:
		return "sticker"
	case m.LocationMessage != nil || m.LiveLocationMessage != nil:
		return "location"
	case m.ContactMessage != nil || m.ContactsArrayMessage != nil:
		return "contact"
	case m.ReactionMessage != nil:
		return "reaction"
	case m.PollCreationMessage != nil:
		return "poll"
	default:
		return "unknown"
	}
}

// messageText extracts the human-readable text of a message, if any.
func messageText(msg *waE2E.Message) string {
	if t := msg.GetConversation(); t != "" {
		return t
	}
	if t := msg.GetExtendedTextMessage().GetText(); t != "" {
		return t
	}
	if t := msg.GetImageMessage().GetCaption(); t != "" {
		return t
	}
	if t := msg.GetVideoMessage().GetCaption(); t != "" {
		return t
	}
	return msg.GetDocumentMessage().GetCaption()
}

func rawMessage(msg *waE2E.Message) []byte {
	raw, err := proto.Marshal(msg)
	if err != nil {
		return nil
	}
	return raw
}

func nilIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}

func GetMessages(ctx context.Context, db *sql.DB, client *whatsmeow.Client, ourJID, chatJID string) ([]MessageEntry, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT id, from_me, sender_jid, text, ts
		FROM whatsmeow_messages
		WHERE our_jid = $1 AND chat_jid = $2
		ORDER BY ts ASC`, ourJID, chatJID)
	if err != nil {
		return nil, fmt.Errorf("query messages: %w", err)
	}
	defer rows.Close()

	var entries []MessageEntry
	for rows.Next() {
		var id string
		var fromMe bool
		var senderJID string
		var text sql.NullString
		var ts time.Time
		if err := rows.Scan(&id, &fromMe, &senderJID, &text, &ts); err != nil {
			return nil, fmt.Errorf("scan message: %w", err)
		}
		entries = append(entries, MessageEntry{
			ID:               id,
			FromMe:           fromMe,
			FromName:         formatSenderName(ctx, client, senderJID, fromMe),
			Content:          text.String,
			MessageTimestamp: ts.Format(time.RFC3339),
		})
	}
	return entries, rows.Err()
}

func formatSenderName(ctx context.Context, client *whatsmeow.Client, senderJID string, fromMe bool) string {
	if fromMe {
		return "Me"
	}
	jid, err := types.ParseJID(senderJID)
	if err != nil {
		return senderJID
	}
	if client != nil && client.Store != nil && client.Store.Contacts != nil {
		contact, err := client.Store.Contacts.GetContact(ctx, jid)
		if err == nil && contact.Found {
			if contact.FullName != "" {
				return contact.FullName
			}
			if contact.FirstName != "" {
				return contact.FirstName
			}
			if contact.BusinessName != "" {
				return contact.BusinessName
			}
		}
	}
	if jid.Server == types.DefaultUserServer {
		return jid.User
	}
	return jid.String()
}
