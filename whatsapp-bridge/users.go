package main

import (
	"context"
	"database/sql"
)

func GetDeviceID(ctx context.Context, db *sql.DB, email string) (string, error) {
	var deviceID string
	err := db.QueryRowContext(ctx, "SELECT device_id FROM whatsmeow_users WHERE email = $1", email).Scan(&deviceID)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return deviceID, err
}

func SaveDeviceID(ctx context.Context, db *sql.DB, email, deviceID string) error {
	_, err := db.ExecContext(ctx, "INSERT INTO whatsmeow_users (email, device_id) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET device_id = $2", email, deviceID)
	return err
}

func DeleteUserData(db *sql.DB, email string) error {
	ctx := context.Background()
	deviceResult, err := db.QueryContext(ctx, "SELECT device_id FROM whatsmeow_users WHERE email = $1", email)
	if err != nil {
		return err
	}
	defer deviceResult.Close()
	var deviceID string
	if deviceResult.Next() {
		if err := deviceResult.Scan(&deviceID); err != nil {
			return err
		}
	}
	if err := deviceResult.Err(); err != nil {
		return err
	}
	if deviceID == "" {
		return nil
	}

	tables := []struct {
		name   string
		column string
	}{
		{"whatsmeow_messages", "our_jid"},
		{"whatsmeow_chats", "our_jid"},
		{"whatsmeow_groups", "our_jid"},
		{"whatsmeow_users", "email"},
		{"whatsmeow_device", "jid"},
		{"whatsmeow_identity", "our_jid"},
		{"whatsmeow_prekeys", "jid"},
		{"whatsmeow_sessions", "our_jid"},
		{"whatsmeow_sender_keys", "our_jid"},
		{"whatsmeow_app_state_sync_keys", "our_jid"},
		{"whatsmeow_app_state_version", "our_jid"},
		{"whatsmeow_contacts", "our_jid"},
		{"whatsmeow_chat_settings", "our_jid"},
		{"whatsmeow_message_secrets", "our_jid"},
		{"whatsmeow_privacy_tokens", "our_jid"},
		{"whatsmeow_app_state_mutation_macs", "our_jid"},
	}
	for _, t := range tables {
		var value any = deviceID
		if t.column == "email" {
			value = email
		}
		if _, err := db.ExecContext(ctx, "DELETE FROM "+t.name+" WHERE "+t.column+" = $1", value); err != nil {
			return err
		}
	}
	return nil
}
