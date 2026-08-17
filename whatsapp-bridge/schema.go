package main

import (
	"context"
	"database/sql"
	"fmt"
)

// ensureSchema creates the custom whatsmeow_ tables used by the bridge if they
// do not already exist. The main application migrations also create these
// tables; this function makes the bridge robust when started standalone.
func ensureSchema(ctx context.Context, db *sql.DB) error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS whatsmeow_users (
			email     TEXT NOT NULL PRIMARY KEY,
			device_id TEXT NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS whatsmeow_messages (
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
		)`,
		`CREATE TABLE IF NOT EXISTS whatsmeow_groups (
			our_jid    TEXT NOT NULL,
			group_jid  TEXT NOT NULL,
			group_name TEXT NOT NULL,
			PRIMARY KEY (our_jid, group_jid)
		)`,
		`CREATE TABLE IF NOT EXISTS whatsmeow_chats (
			our_jid         TEXT        NOT NULL,
			chat_jid        TEXT        NOT NULL,
			last_message_ts TIMESTAMPTZ NOT NULL,
			archived        BOOLEAN     NOT NULL DEFAULT FALSE,
			PRIMARY KEY (our_jid, chat_jid)
		)`,
	}

	for _, stmt := range statements {
		if _, err := db.ExecContext(ctx, stmt); err != nil {
			return fmt.Errorf("ensure schema: %w", err)
		}
	}
	return nil
}
