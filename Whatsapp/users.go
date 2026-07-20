package main

import (
	"context"
	"database/sql"
	"fmt"
)

const usersSchema = `
CREATE TABLE IF NOT EXISTS whatsmeow_users (
	email     TEXT NOT NULL PRIMARY KEY,
	device_id TEXT NOT NULL
)`

func initializeUsersDb(ctx context.Context, db *sql.DB) error {
	if _, err := db.ExecContext(ctx, usersSchema); err != nil {
		return fmt.Errorf("create whatsmeow_users table: %w", err)
	}
	return nil
}

func getDeviceID(ctx context.Context, db *sql.DB, email string) (string, error) {
	var deviceID string
	err := db.QueryRowContext(ctx, "SELECT device_id FROM whatsmeow_users WHERE email = $1", email).Scan(&deviceID)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return deviceID, err
}

func saveDeviceID(ctx context.Context, db *sql.DB, email, deviceID string) error {
	_, err := db.ExecContext(ctx, "INSERT INTO whatsmeow_users (email, device_id) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET device_id = $2", email, deviceID)
	return err
}
