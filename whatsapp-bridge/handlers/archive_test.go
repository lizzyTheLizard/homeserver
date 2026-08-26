package handlers

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"testing"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func openTestDB(t *testing.T) *sql.DB {
	dsn := os.Getenv("DB_CONNECTION_STRING")
	if dsn == "" {
		dsn = "postgres://homeserver:homeserver@postgresdev:5432/homeserver?sslmode=disable"
	}
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	return db
}

// resetTestData clears the test rows we use so each case is isolated.
func resetTestData(t *testing.T, db *sql.DB, ourJID string) {
	ctx := context.Background()
	_, err := db.ExecContext(ctx, "DELETE FROM whatsmeow_chats WHERE our_jid = $1", ourJID)
	if err != nil {
		t.Fatalf("delete chats: %v", err)
	}
	_, err = db.ExecContext(ctx, "DELETE FROM whatsmeow_lid_map WHERE lid = $1", "123456789:1")
	if err != nil {
		t.Fatalf("delete lid_map: %v", err)
	}
}

func insertChat(t *testing.T, db *sql.DB, ourJID, chatJID string, archived bool) {
	ctx := context.Background()
	_, err := db.ExecContext(ctx,
		"INSERT INTO whatsmeow_chats (our_jid, chat_jid, last_message_ts, archived) VALUES ($1,$2,$3,$4) "+
			"ON CONFLICT (our_jid, chat_jid) DO UPDATE SET archived = excluded.archived",
		ourJID, chatJID, time.Now(), archived)
	if err != nil {
		t.Fatalf("insert chat %s: %v", chatJID, err)
	}
}

func getArchived(t *testing.T, db *sql.DB, ourJID, chatJID string) (bool, bool) {
	ctx := context.Background()
	var archived bool
	err := db.QueryRowContext(ctx, "SELECT archived FROM whatsmeow_chats WHERE our_jid=$1 AND chat_jid=$2", ourJID, chatJID).Scan(&archived)
	if err == sql.ErrNoRows {
		return false, false
	}
	if err != nil {
		t.Fatalf("get archived %s: %v", chatJID, err)
	}
	return archived, true
}

func TestSetChatArchivedScenarios(t *testing.T) {
	db := openTestDB(t)
	defer db.Close()
	ourJID := "test-archive-our@s.whatsapp.net"
	ctx := context.Background()

	pn := "123456789@s.whatsapp.net"
	lid := "123456789:1@lid"

	cases := []struct {
		name        string
		storedJID   string // how the chat row is stored
		eventJID    string // what the archive event carries
		lidMap      bool   // whether the lid_map row exists
		wantStored  bool   // expected archived flag on stored row
		wantOther   bool   // expected archived flag on the OTHER row (if exists)
	}{
		{"PN stored, PN event", pn, pn, false, true, false},
		{"LID stored, LID event", lid, lid, false, true, false},
		{"LID stored, PN event, lidmap", lid, pn, true, true, false},
		{"PN stored, LID event, lidmap", pn, lid, true, true, false},
		{"LID stored, PN event, NO lidmap", lid, pn, false, false, false},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			resetTestData(t, db, ourJID)
			insertChat(t, db, ourJID, c.storedJID, false)
			if c.lidMap {
				_, err := db.ExecContext(ctx,
					"INSERT INTO whatsmeow_lid_map (lid, pn) VALUES ($1,$2) ON CONFLICT DO NOTHING",
					"123456789:1", "123456789")
				if err != nil {
					t.Fatalf("insert lid_map: %v", err)
				}
			}
			if err := setChatArchived(ctx, db, ourJID, c.eventJID, true); err != nil {
				t.Fatalf("setChatArchived: %v", err)
			}
			got, ok := getArchived(t, db, ourJID, c.storedJID)
			if !ok {
				t.Fatalf("stored row %s disappeared", c.storedJID)
			}
			if got != c.wantStored {
				t.Errorf("stored row %s archived = %v, want %v", c.storedJID, got, c.wantStored)
			}
			fmt.Printf("case %q: stored=%v eventJID=%q storedJID=%q lidMap=%v\n", c.name, got, c.eventJID, c.storedJID, c.lidMap)
		})
	}
}
