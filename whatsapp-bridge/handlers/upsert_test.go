package handlers

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"go.mau.fi/whatsmeow/proto/waE2E"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func TestUpsertChatsCopiesArchivedFromSettings(t *testing.T) {
	db := openTestDB(t)
	defer db.Close()
	ourJID := "test-upsert-our@s.whatsapp.net"

	cases := []struct {
		name       string
		storedJID  string // chat_jid used by the message event
		settingJID string // chat_jid key in whatsmeow_chat_settings
		lidMap     bool
		want       bool
	}{
		{"PN matches, archived", "123456789@s.whatsapp.net", "123456789@s.whatsapp.net", false, true},
		{"PN matches, not archived", "123456789@s.whatsapp.net", "123456789@s.whatsapp.net", false, false},
		{"LID stored, setting keyed by PN, lidmap", "123456789:1@lid", "123456789@s.whatsapp.net", true, true},
		{"LID stored, setting keyed by PN, NO lidmap", "123456789:1@lid", "123456789@s.whatsapp.net", false, false},
		{"no setting at all", "123456789@s.whatsapp.net", "", false, false},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			ctx := context.Background()
			tx, err := db.BeginTx(ctx, nil)
			if err != nil {
				t.Fatalf("begin tx: %v", err)
			}
			defer tx.Rollback()
			// Disable FK so we can seed whatsmeow_chat_settings without a full device row.
			if _, err := tx.ExecContext(ctx, "SET LOCAL session_replication_role = 'replica'"); err != nil {
				t.Fatalf("set replica: %v", err)
			}
			if _, err := tx.ExecContext(ctx, "DELETE FROM whatsmeow_chats WHERE our_jid=$1", ourJID); err != nil {
				t.Fatalf("delete chats: %v", err)
			}
			if _, err := tx.ExecContext(ctx, "DELETE FROM whatsmeow_chat_settings WHERE our_jid=$1", ourJID); err != nil {
				t.Fatalf("delete settings: %v", err)
			}
			if _, err := tx.ExecContext(ctx, "DELETE FROM whatsmeow_lid_map WHERE lid='123456789:1'"); err != nil {
				t.Fatalf("delete lid_map: %v", err)
			}
			if c.settingJID != "" {
				if _, err := tx.ExecContext(ctx,
					"INSERT INTO whatsmeow_chat_settings (our_jid, chat_jid, archived) VALUES ($1,$2,$3) "+
						"ON CONFLICT (our_jid, chat_jid) DO UPDATE SET archived = excluded.archived",
					ourJID, c.settingJID, c.want); err != nil {
					t.Fatalf("set chat_setting %s: %v", c.settingJID, err)
				}
			}
			if c.lidMap {
				if _, err := tx.ExecContext(ctx,
					"INSERT INTO whatsmeow_lid_map (lid, pn) VALUES ($1,$2) ON CONFLICT DO NOTHING",
					"123456789:1", "123456789"); err != nil {
					t.Fatalf("insert lid_map: %v", err)
				}
			}

			chatJID, err := types.ParseJID(c.storedJID)
			if err != nil {
				t.Fatalf("parse jid %s: %v", c.storedJID, err)
			}
			msg := &events.Message{
				Info: types.MessageInfo{
					MessageSource: types.MessageSource{Chat: chatJID},
					ID:            "msg-1",
					Timestamp:     time.Now(),
				},
				Message: &waE2E.Message{},
			}
			if err := upsertChats(ctx, tx, ourJID, []*events.Message{msg}, false); err != nil {
				t.Fatalf("upsertChats: %v", err)
			}

			var archived bool
			err = tx.QueryRowContext(ctx, "SELECT archived FROM whatsmeow_chats WHERE our_jid=$1 AND chat_jid=$2", ourJID, c.storedJID).Scan(&archived)
			if err == sql.ErrNoRows {
				t.Fatalf("chat row %s was not created", c.storedJID)
			}
			if err != nil {
				t.Fatalf("get archived %s: %v", c.storedJID, err)
			}
			if archived != c.want {
				t.Errorf("archived = %v, want %v", archived, c.want)
			}
		})
	}
}
