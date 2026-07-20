package main

import (
	"context"
	"database/sql"
	"fmt"

	"go.mau.fi/whatsmeow/proto/waHistorySync"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
)

const groupsSchema = `
CREATE TABLE IF NOT EXISTS whatsmeow_groups (
	our_jid    TEXT NOT NULL,
	group_jid  TEXT NOT NULL,
	group_name TEXT NOT NULL,
	PRIMARY KEY (our_jid, group_jid)
)`

func initializeGroupsDb(ctx context.Context, db *sql.DB) error {
	if _, err := db.ExecContext(ctx, groupsSchema); err != nil {
		return fmt.Errorf("create whatsmeow_groups table: %w", err)
	}
	return nil
}

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

func saveHistorySyncGroups(ctx context.Context, db *sql.DB, ourJID string, data *waHistorySync.HistorySync) {
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

func upsertGroupName(ctx context.Context, db *sql.DB, ourJID, groupJID, groupName string) error {
	_, err := db.ExecContext(ctx,
		`INSERT INTO whatsmeow_groups (our_jid, group_jid, group_name) VALUES ($1, $2, $3)
		 ON CONFLICT (our_jid, group_jid) DO UPDATE SET group_name = $3`,
		ourJID, groupJID, groupName)
	return err
}
