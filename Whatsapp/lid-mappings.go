package main

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/types"
)

func resolveLIDsFromEvent(ctx context.Context, db *sql.DB, client *whatsmeow.Client, jids []types.JID) {
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
		emitError(fmt.Errorf("resolve LID mappings: %w", err))
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
