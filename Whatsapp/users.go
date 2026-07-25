package main

import (
	"context"
	"database/sql"
)

func getDeviceID(ctx context.Context, db *sql.DB, email string) (string, error) {
	var deviceID string
	err := db.QueryRowContext(ctx, "SELECT device_id FROM whatsapp_users WHERE email = $1", email).Scan(&deviceID)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return deviceID, err
}

func saveDeviceID(ctx context.Context, db *sql.DB, email, deviceID string) error {
	_, err := db.ExecContext(ctx, "INSERT INTO whatsapp_users (email, device_id) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET device_id = $2", email, deviceID)
	return err
}
