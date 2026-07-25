package main

import (
	"bufio"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/appstate"
	"go.mau.fi/whatsmeow/proto/waE2E"
	"go.mau.fi/whatsmeow/types"
	"google.golang.org/protobuf/proto"
)

// Commands accepted on stdin.
const (
	CmdSendMessage = "send_message"
	CmdArchiveChat = "archive_chat"
	CmdFullSync    = "full_sync"
)

// Command is a message read from stdin, one JSON object per line.
type Command struct {
	Command  string `json:"command"`
	To       string `json:"to,omitempty"`
	Text     string `json:"text,omitempty"`
	ID       string `json:"id,omitempty"`
	Archived *bool  `json:"archived,omitempty"`
}

func readCommands(ctx context.Context, client *whatsmeow.Client, db *sql.DB) {
	go func() {
		<-ctx.Done()
		_ = os.Stdin.Close()
	}()

	scanner := bufio.NewScanner(os.Stdin)
	scanner.Buffer(make([]byte, 64*1024), 16*1024*1024)
	for scanner.Scan() {
		if ctx.Err() != nil {
			return
		}
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		var cmd Command
		if err := json.Unmarshal([]byte(line), &cmd); err != nil {
			emitError(fmt.Errorf("invalid command: %w", err))
			continue
		}
		if err := handleCommand(ctx, client, db, cmd); err != nil {
			emitError(err)
		}
	}
	if err := scanner.Err(); err != nil && ctx.Err() == nil {
		emitError(fmt.Errorf("read stdin: %w", err))
	}
}

func handleCommand(ctx context.Context, client *whatsmeow.Client, db *sql.DB, cmd Command) error {
	switch cmd.Command {
	case CmdSendMessage:
		return sendMessage(ctx, client, cmd)
	case CmdArchiveChat:
		return archiveChat(ctx, client, cmd)
	case CmdFullSync:
		return fullSync(ctx, client, db)
	default:
		return fmt.Errorf("unknown command %q", cmd.Command)
	}
}

func sendMessage(ctx context.Context, client *whatsmeow.Client, cmd Command) error {
	if cmd.To == "" {
		return errors.New("send_message: missing 'to'")
	}
	if cmd.Text == "" {
		return errors.New("send_message: missing 'text'")
	}
	to, err := types.ParseJID(cmd.To)
	if err != nil {
		return fmt.Errorf("send_message: %w", err)
	}
	_, err = client.SendMessage(ctx, to, &waE2E.Message{Conversation: proto.String(cmd.Text)})
	if err != nil {
		return fmt.Errorf("send_message: %w", err)
	}
	emitLog("debug", fmt.Sprintf("message sent to %s", cmd.To))
	return nil
}

func archiveChat(ctx context.Context, client *whatsmeow.Client, cmd Command) error {
	if cmd.ID == "" {
		return errors.New("archive_chat: missing 'id'")
	}
	if cmd.Archived == nil {
		return errors.New("archive_chat: missing 'archived'")
	}
	jid, err := types.ParseJID(cmd.ID)
	if err != nil {
		return fmt.Errorf("archive_chat: %w", err)
	}
	if err := client.SendAppState(ctx, appstate.BuildArchive(jid, *cmd.Archived, time.Now(), nil)); err != nil {
		return fmt.Errorf("archive_chat: %w", err)
	}
	action := "archived"
	if !*cmd.Archived {
		action = "unarchived"
	}
	emitLog("debug", fmt.Sprintf("chat %s %s", cmd.ID, action))
	return nil
}
