package main

import (
	"context"
	"database/sql"
	"fmt"

	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/proto/waHistorySync"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
)

func handleGroupInfo(ctx context.Context, db *sql.DB, ourJID string, evt *events.GroupInfo) {
	if evt.Name == nil || evt.Name.Name == "" {
		return
	}
	if err := upsertGroupName(ctx, db, ourJID, evt.JID.String(), evt.Name.Name); err != nil {
		emitError(fmt.Errorf("store group info: %w", err))
	}
}

func handleJoinedGroup(ctx context.Context, db *sql.DB, ourJID string, evt *events.JoinedGroup) {
	if evt.GroupName.Name == "" {
		return
	}
	if err := upsertGroupName(ctx, db, ourJID, evt.JID.String(), evt.GroupName.Name); err != nil {
		emitError(fmt.Errorf("store joined group: %w", err))
	}
}

func handleHistorySyncGroups(ctx context.Context, db *sql.DB, ourJID string, data *waHistorySync.HistorySync) {
	for _, conv := range data.GetConversations() {
		chatJID, err := types.ParseJID(conv.GetID())
		if err != nil {
			continue
		}
		if chatJID.Server != types.GroupServer {
			continue
		}
		name := conv.GetName()
		if name == "" {
			continue
		}
		if err := upsertGroupName(ctx, db, ourJID, chatJID.String(), name); err != nil {
			emitError(fmt.Errorf("store history sync group: %w", err))
		}
	}
}

func upsertGroupName(ctx context.Context, ex execer, ourJID, groupJID, groupName string) error {
	_, err := ex.ExecContext(ctx,
		`INSERT INTO whatsapp_groups (our_jid, group_jid, group_name) VALUES ($1, $2, $3)
		 ON CONFLICT (our_jid, group_jid) DO UPDATE SET group_name = $3`,
		ourJID, groupJID, groupName)
	return err
}

func syncJoinedGroups(ctx context.Context, client *whatsmeow.Client, db *sql.DB) error {
	ourJID := client.Store.GetJID().String()
	groups, err := client.GetJoinedGroups(ctx)
	if err != nil {
		return fmt.Errorf("get joined groups: %w", err)
	}
	emitLog("debug", fmt.Sprintf("syncing %d joined groups", len(groups)))
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback()
	joinedJIDs := make(map[string]bool)
	for _, group := range groups {
		jid := group.JID.String()
		joinedJIDs[jid] = true
		if group.GroupName.Name != "" {
			if err := upsertGroupName(ctx, tx, ourJID, jid, group.GroupName.Name); err != nil {
				return fmt.Errorf("upsert group %s: %w", jid, err)
			}
		}
	}
	rows, err := tx.QueryContext(ctx, "SELECT group_jid FROM whatsapp_groups WHERE our_jid = $1", ourJID)
	if err != nil {
		return fmt.Errorf("query existing groups: %w", err)
	}
	defer rows.Close()
	var toDelete []string
	for rows.Next() {
		var jid string
		if err := rows.Scan(&jid); err != nil {
			return fmt.Errorf("scan group jid: %w", err)
		}
		if !joinedJIDs[jid] {
			toDelete = append(toDelete, jid)
		}
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("rows iteration: %w", err)
	}
	for _, jid := range toDelete {
		if _, err := tx.ExecContext(ctx, "DELETE FROM whatsapp_groups WHERE our_jid = $1 AND group_jid = $2", ourJID, jid); err != nil {
			return fmt.Errorf("delete group %s: %w", jid, err)
		}
	}
	if len(toDelete) > 0 {
		emitLog("debug", fmt.Sprintf("pruned %d stale groups", len(toDelete)))
	}
	return tx.Commit()
}
