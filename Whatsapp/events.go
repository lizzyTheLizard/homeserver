package main

import (
	"encoding/json"
	"os"
	"sync"
)

// Event types published on stdout.
const (
	EventConnectionEstablished = "connection_established"
	EventQRCode                = "qr_code"
	EventError                 = "error"
	EventChats                 = "chats"
	EventMessages              = "messages"
)

// ChatEntry represents a single chat (group or individual) with its metadata.
type ChatEntry struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	IsArchived    bool   `json:"isArchived"`
	IsGroup       bool   `json:"isGroup"`
	LastMessageTs string `json:"lastMessageTimestamp,omitempty"`
}

// MessageEntry represents a single message with sender and content info.
type MessageEntry struct {
	ID               string `json:"id"`
	FromMe           bool   `json:"fromMe"`
	FromName         string `json:"fromName"`
	Content          string `json:"content"`
	MessageTimestamp string `json:"messageTimestamp"`
}

// Event is a message published on stdout, one JSON object per line.
type Event struct {
	Type     string         `json:"type"`
	UserID   string         `json:"user_id,omitempty"`
	QR       string         `json:"qr,omitempty"`
	Message  string         `json:"message,omitempty"`
	Chats    []ChatEntry    `json:"chats,omitempty"`
	Messages []MessageEntry `json:"messages,omitempty"`
}

var (
	stdoutMu  sync.Mutex
	stdoutEnc = json.NewEncoder(os.Stdout)
)

func emitEvent(evt Event) {
	stdoutMu.Lock()
	defer stdoutMu.Unlock()
	// Encode writes exactly one JSON line. A broken stdout pipe means the
	// parent is gone, in which case the process exits soon anyway.
	_ = stdoutEnc.Encode(evt)
}

func emitError(err error) {
	if err == nil {
		return
	}
	emitEvent(Event{Type: EventError, Message: err.Error()})
}
