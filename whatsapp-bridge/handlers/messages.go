package handlers

import (
	"log"
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

// Message is the response shape for the messages endpoint.
type Message struct {
	ID               string `json:"id"`
	FromMe           bool   `json:"fromMe"`
	FromName         string `json:"fromName"`
	Content          string `json:"content"`
	MessageTimestamp string `json:"messageTimestamp"`
}

// MessageRow mirrors the SQL projection used to build a Message.
type MessageRow struct {
	ID               string
	FromMe           bool
	SenderJID        string
	Text             sql.NullString
	MessageTimestamp string
	ContactName      sql.NullString
}

// execer is satisfied by both *sql.DB and *sql.Tx.
type execer interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
}

const insertMessagePrefix = `
INSERT INTO whatsmeow_messages (our_jid, chat_jid, sender_jid, id, ts, type, text, from_me, raw)
VALUES `

const insertMessageSuffix = ` ON CONFLICT (our_jid, chat_jid, id) DO NOTHING`

// insertBatchSize limits how many messages are stored per INSERT statement.
// Batching avoids one database round-trip per message during history sync,
// which otherwise dominates the sync time.
const insertBatchSize = 500

// HandleMessageEvent handles an incoming message event from WhatsApp.
func HandleMessageEvent(ctx context.Context, db *sql.DB, client *whatsmeow.Client, ourJID string, evt *events.Message) error {
	if err := save(ctx, db, ourJID, evt); err != nil {
		return fmt.Errorf("store message %s: %w", evt.Info.ID, err)
	}
	resolveLIDsEvent(ctx, db, client, []types.JID{evt.Info.Chat, evt.Info.Sender})
	return nil
}

// HandleHistorySyncMessagesEvent handles message history synced from WhatsApp.
func HandleHistorySyncMessagesEvent(ctx context.Context, db *sql.DB, client *whatsmeow.Client, ourJID string, data *waHistorySync.HistorySync) error {
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
	log.Printf("[debug] history sync stored %d messages", msgCount)
	jids := make([]types.JID, 0, len(seenJIDs))
	for _, jid := range seenJIDs {
		jids = append(jids, jid)
	}
	resolveLIDsEvent(ctx, db, client, jids)
	return nil
}

// SendMessageRequest handles a send-message request from the HTTP server.
func SendMessageRequest(ctx context.Context, client *whatsmeow.Client, to, text string) error {
	if to == "" {
		return fmt.Errorf("send_message: missing 'to'")
	}
	if text == "" {
		return fmt.Errorf("send_message: missing 'text'")
	}
	recipient, err := types.ParseJID(to)
	if err != nil {
		return fmt.Errorf("send_message: %w", err)
	}
	_, err = client.SendMessage(ctx, recipient, &waE2E.Message{Conversation: proto.String(text)})
	if err != nil {
		return fmt.Errorf("send_message: %w", err)
	}
	log.Printf("[debug] message sent to %s", to)
	return nil
}

// GetMessagesRequest handles a get-messages request from the HTTP server.
func GetMessagesRequest(ctx context.Context, db *sql.DB, ourJID, chatJID string) ([]Message, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT
			m.id,
			m.from_me,
			m.sender_jid,
			m.text,
			TO_CHAR(m.ts AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS message_timestamp,
			COALESCE(
				co_direct.full_name, co_direct.first_name, co_direct.business_name,
				co_via_lid.full_name, co_via_lid.first_name, co_via_lid.business_name,
				co_via_pn.full_name, co_via_pn.first_name, co_via_pn.business_name,
				COALESCE(lm.pn || '@s.whatsapp.net', m.sender_jid)
			) AS contact_name
		FROM whatsmeow_messages m
		LEFT JOIN whatsmeow_lid_map lm ON lm.lid = replace(m.sender_jid, '@lid', '')
		LEFT JOIN whatsmeow_lid_map lm2 ON lm2.pn = replace(m.sender_jid, '@s.whatsapp.net', '')
		LEFT JOIN whatsmeow_contacts co_direct ON co_direct.their_jid = m.sender_jid AND co_direct.our_jid = $1
		LEFT JOIN whatsmeow_contacts co_via_lid ON co_via_lid.their_jid = lm.pn || '@s.whatsapp.net' AND co_via_lid.our_jid = $1
		LEFT JOIN whatsmeow_contacts co_via_pn ON co_via_pn.their_jid = lm2.lid || '@lid' AND co_via_pn.our_jid = $1
		WHERE m.our_jid = $1 AND m.chat_jid = $2 AND m.text IS NOT NULL
		ORDER BY m.ts ASC`,
		ourJID, chatJID,
	)
	if err != nil {
		return nil, fmt.Errorf("query messages: %w", err)
	}
	defer rows.Close()

	var messages []Message
	for rows.Next() {
		var r MessageRow
		if err := rows.Scan(
			&r.ID,
			&r.FromMe,
			&r.SenderJID,
			&r.Text,
			&r.MessageTimestamp,
			&r.ContactName,
		); err != nil {
			return nil, fmt.Errorf("scan message: %w", err)
		}
		contactName := ""
		if r.ContactName.Valid {
			contactName = r.ContactName.String
		}
		messages = append(messages, Message{
			ID:               r.ID,
			FromMe:           r.FromMe,
			FromName:         formatSenderName(r.SenderJID, r.FromMe, contactName),
			Content:          nullString(r.Text),
			MessageTimestamp: r.MessageTimestamp,
		})
	}
	return messages, rows.Err()
}

// save stores a single message event.
func save(ctx context.Context, db *sql.DB, ourJID string, evt *events.Message) error {
	return insertMessages(ctx, db, ourJID, []*events.Message{evt}, true)
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
	updateSuffix := `DO UPDATE SET last_message_ts = GREATEST(whatsmeow_chats.last_message_ts, EXCLUDED.last_message_ts)`
	if unarchive {
		updateSuffix += `, archived = FALSE`
	}
	// When a chat row is inserted for the first time (which happens during
	// history sync, i.e. AFTER the app-state sync that already recorded the
	// archive status in whatsmeow_chat_settings), copy that archived flag
	// across. Otherwise a freshly created row would default to archived = FALSE
	// and silently drop the archive status the client already reported, so
	// chats would never appear as archived.
	//
	// Archived chats are keyed in whatsmeow_chat_settings by either the LID or
	// the phone-number form of the JID, so we resolve both via whatsmeow_lid_map
	// to find the matching setting regardless of which form the chat row uses.
	archivedValue := `CASE WHEN $4 THEN FALSE
		ELSE COALESCE(
			(SELECT archived FROM whatsmeow_chat_settings WHERE our_jid = $1 AND chat_jid = $2),
			(SELECT s.archived
			 FROM whatsmeow_chat_settings s
			 JOIN whatsmeow_lid_map m
			   ON (m.lid = replace($2, '@lid', '') AND s.chat_jid = m.pn || '@s.whatsapp.net')
			   OR (m.pn = replace($2, '@s.whatsapp.net', '') AND s.chat_jid = m.lid || '@lid')
			 WHERE s.our_jid = $1),
			FALSE
		) END`
	for chatJID, ts := range chatTimestamps {
		_, err := ex.ExecContext(ctx,
			`INSERT INTO whatsmeow_chats (our_jid, chat_jid, last_message_ts, archived)
			 VALUES ($1, $2, $3, `+archivedValue+`)
			 ON CONFLICT (our_jid, chat_jid) `+updateSuffix,
			ourJID, chatJID, ts, unarchive)
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

func nullString(ns sql.NullString) string {
	if ns.Valid {
		return ns.String
	}
	return ""
}

func formatSenderName(senderJID string, fromMe bool, contactName string) string {
	if fromMe {
		return "Me"
	}
	if contactName != "" {
		return contactName
	}
	if strings.HasSuffix(senderJID, "@s.whatsapp.net") {
		return senderJID[:strings.Index(senderJID, "@")]
	}
	return senderJID
}

func resolveLIDsEvent(ctx context.Context, db *sql.DB, client *whatsmeow.Client, jids []types.JID) {
	lidJIDs := make([]types.JID, 0, len(jids))
	lidValues := make([]string, 0, len(jids))
	for _, jid := range jids {
		if jid.Server == types.HiddenUserServer || jid.Server == types.HostedLIDServer {
			lidJIDs = append(lidJIDs, jid)
			lidValues = append(lidValues, jid.User)
		}
	}
	if len(lidJIDs) == 0 {
		return
	}

	existing, err := queryExistingLIDs(ctx, db, lidValues)
	if err != nil {
		log.Printf("[error] resolve LID mappings: %v", err)
		return
	}

	var unresolved []types.JID
	for i, jid := range lidJIDs {
		if !existing[lidValues[i]] {
			unresolved = append(unresolved, jid)
		}
	}
	if len(unresolved) > 0 {
		client.GetUserInfo(ctx, unresolved)
	}
}

func queryExistingLIDs(ctx context.Context, db *sql.DB, lidValues []string) (map[string]bool, error) {
	if len(lidValues) == 0 {
		return nil, nil
	}
	placeholders := make([]string, len(lidValues))
	args := make([]any, len(lidValues))
	for i, v := range lidValues {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
		args[i] = v
	}
	query := fmt.Sprintf("SELECT lid FROM whatsmeow_lid_map WHERE lid IN (%s)", strings.Join(placeholders, ","))
	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make(map[string]bool)
	for rows.Next() {
		var lid string
		if err := rows.Scan(&lid); err != nil {
			return nil, err
		}
		result[lid] = true
	}
	return result, rows.Err()
}
