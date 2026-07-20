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
	CmdGetChats    = "get_chats"
	CmdGetMessages = "get_messages"
)

// Command is a message read from stdin, one JSON object per line.
type Command struct {
	Command  string `json:"command"`
	To       string `json:"to,omitempty"`
	Text     string `json:"text,omitempty"`
	ID       string `json:"id,omitempty"`
	Archived *bool  `json:"archived,omitempty"`
	Read     *bool  `json:"read,omitempty"`
	ChatJID  string `json:"chatJID,omitempty"`
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
	case CmdGetChats:
		return handleGetChats(ctx, client, db)
	case CmdGetMessages:
		return handleGetMessages(ctx, client, db, cmd)
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
	return nil
}

func handleGetChats(ctx context.Context, client *whatsmeow.Client, db *sql.DB) error {
	entries, err := GetChats(ctx, db, client, client.Store.GetJID().String())
	if err != nil {
		return fmt.Errorf("get conversations: %w", err)
	}
	emitEvent(Event{Type: EventChats, Chats: entries})
	return nil
}

func handleGetMessages(ctx context.Context, client *whatsmeow.Client, db *sql.DB, cmd Command) error {
	if cmd.ChatJID == "" {
		return errors.New("get_messages: missing 'chatJID'")
	}
	chat, err := types.ParseJID(cmd.ChatJID)
	if err != nil {
		return fmt.Errorf("get_messages: %w", err)
	}
	entries, err := GetMessages(ctx, db, client, client.Store.GetJID().String(), chat.String())
	if err != nil {
		return fmt.Errorf("get messages: %w", err)
	}

	emitEvent(Event{Type: EventMessages, Messages: entries})
	return nil
}
