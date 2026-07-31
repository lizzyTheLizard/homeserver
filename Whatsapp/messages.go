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

const insertMessagePrefix = `
INSERT INTO whatsapp_messages (our_jid, chat_jid, sender_jid, id, ts, type, text, from_me, raw)
VALUES `

const insertMessageSuffix = ` ON CONFLICT (our_jid, chat_jid, id) DO NOTHING`

// insertBatchSize limits how many messages are stored per INSERT statement.
// Batching avoids one database round-trip per message during history sync,
// which otherwise dominates the sync time.
const insertBatchSize = 500

// save stores a single message event.
func save(ctx context.Context, db *sql.DB, ourJID string, evt *events.Message) error {
	return insertMessages(ctx, db, ourJID, []*events.Message{evt}, true)
}

// handleHistorySyncMessages parses and stores all messages contained in a history sync
// blob. Messages that cannot be parsed are skipped, so one broken message does
// not abort the whole sync.
func handleHistorySyncMessages(ctx context.Context, db *sql.DB, client *whatsmeow.Client, ourJID string, data *waHistorySync.HistorySync) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback()

	var batch []*events.Message
	seenJIDs := make(map[string]types.JID)
	var msgCount int
	for _, conv := range data.GetConversations() {
		chatJID, err := types.ParseJID(conv.GetID())
		if err != nil {
			continue
		}
		seenJIDs[chatJID.String()] = chatJID
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
			seenJIDs[evt.Info.Sender.String()] = evt.Info.Sender
			batch = append(batch, evt)
			msgCount++
			if len(batch) >= insertBatchSize {
				if err := insertMessages(ctx, tx, ourJID, batch, false); err != nil {
					return fmt.Errorf("insert history messages: %w", err)
				}
				batch = batch[:0]
			}
		}
	}
	if err := insertMessages(ctx, tx, ourJID, batch, false); err != nil {
		return fmt.Errorf("insert history messages: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	emitLog("debug", fmt.Sprintf("history sync stored %d messages", msgCount))
	jids := make([]types.JID, 0, len(seenJIDs))
	for _, jid := range seenJIDs {
		jids = append(jids, jid)
	}
	resolveLIDsFromEvent(ctx, db, client, jids)
	return nil
}

// insertMessages stores message events with one multi-row INSERT, so a
// history sync does not need one database round-trip per message.
func insertMessages(ctx context.Context, ex execer, ourJID string, evts []*events.Message, unarchive bool) error {
	query, args := buildInsertQuery(ourJID, evts)
	if query == "" {
		return nil
	}
	_, err := ex.ExecContext(ctx, query, args...)
	if err != nil {
		return err
	}
	return upsertChats(ctx, ex, ourJID, evts, unarchive)
}

func upsertChats(ctx context.Context, ex execer, ourJID string, evts []*events.Message, unarchive bool) error {
	chatTimestamps := make(map[string]time.Time)
	for _, evt := range evts {
		if evt.Info.ID == "" || evt.Message == nil {
			continue
		}
		chatJID := evt.Info.Chat.String()
		if existing, ok := chatTimestamps[chatJID]; !ok || evt.Info.Timestamp.After(existing) {
			chatTimestamps[chatJID] = evt.Info.Timestamp
		}
	}
	updateSuffix := `DO UPDATE SET last_message_ts = GREATEST(whatsapp_chats.last_message_ts, EXCLUDED.last_message_ts)`
	if unarchive {
		updateSuffix += `, archived = FALSE`
	}
	for chatJID, ts := range chatTimestamps {
		_, err := ex.ExecContext(ctx,
			`INSERT INTO whatsapp_chats (our_jid, chat_jid, last_message_ts, archived)
			 VALUES ($1, $2, $3, FALSE)
			 ON CONFLICT (our_jid, chat_jid) `+updateSuffix,
			ourJID, chatJID, ts)
		if err != nil {
			return fmt.Errorf("upsert chat %s: %w", chatJID, err)
		}
	}
	return nil
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

func handleMessage(ctx context.Context, db *sql.DB, client *whatsmeow.Client, ourJID string, evt *events.Message) error {
	if err := save(ctx, db, ourJID, evt); err != nil {
		return fmt.Errorf("store message %s: %w", evt.Info.ID, err)
	}
	resolveLIDsFromEvent(ctx, db, client, []types.JID{evt.Info.Chat, evt.Info.Sender})
	return nil
}
