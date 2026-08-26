package handlers

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"
	"testing"
	"time"

	"go.mau.fi/whatsmeow/store/sqlstore"
	waLog "go.mau.fi/whatsmeow/util/log"

	_ "github.com/jackc/pgx/v5/stdlib"
)

// chatTableSchema is the bridge's own whatsmeow_chats table. In the running
// application this is created by the main app's SQL migrations, which do not
// run for the bridge test job, so the test harness creates it here.
const chatTableSchema = `CREATE TABLE IF NOT EXISTS whatsmeow_chats (
    our_jid         TEXT        NOT NULL,
    chat_jid        TEXT        NOT NULL,
    last_message_ts TIMESTAMPTZ NOT NULL,
    archived        BOOLEAN     NOT NULL DEFAULT FALSE,
    PRIMARY KEY (our_jid, chat_jid)
);`

// TestMain provisions the schema required by the integration tests against a
// real Postgres (the one provided by the CI service container, or a local one
// via DB_CONNECTION_STRING). It runs whatsmeow's own migrations and creates
// the bridge's whatsmeow_chats table. When no database is reachable the tests
// are still executed and individually skip, so `go test ./...` stays green in
// environments without Postgres.
func TestMain(m *testing.M) {
	dsn := buildDSN()
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		fmt.Printf("skipping tests: cannot open database: %v\n", err)
		os.Exit(m.Run())
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		fmt.Printf("skipping tests: postgres not reachable: %v\n", err)
		_ = db.Close()
		os.Exit(m.Run())
	}

	container := sqlstore.NewWithDB(db, "pgx", waLog.Noop)
	if err := container.Upgrade(ctx); err != nil {
		log.Fatalf("upgrade whatsmeow database: %v", err)
	}
	if _, err := db.ExecContext(ctx, chatTableSchema); err != nil {
		log.Fatalf("create whatsmeow_chats table: %v", err)
	}

	code := m.Run()
	_ = db.Close()
	os.Exit(code)
}

func buildDSN() string {
	dsn := os.Getenv("DB_CONNECTION_STRING")
	if dsn == "" {
		dsn = "postgres://homeserver:homeserver@postgresdev:5432/homeserver?sslmode=disable"
	}
	if !strings.Contains(dsn, "connect_timeout") {
		if strings.Contains(dsn, "?") {
			dsn += "&connect_timeout=5"
		} else {
			dsn += "?connect_timeout=5"
		}
	}
	return dsn
}

// openTestDB opens the Postgres database used by the integration tests. It
// pings with a short connect timeout and skips the calling test when the
// database is not reachable, so a missing database never fails or hangs the
// suite.
func openTestDB(t *testing.T) *sql.DB {
	t.Helper()
	dsn := buildDSN()

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		t.Skipf("skipping: cannot open database: %v", err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		db.Close()
		t.Skipf("skipping: postgres not reachable: %v", err)
	}
	return db
}
