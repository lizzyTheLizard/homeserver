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
	EventLog                   = "log"
	EventLoggedOut             = "logged_out"
	EventFullSyncFinished      = "full_sync_finished"
)

// Event is a message published on stdout, one JSON object per line.
type Event struct {
	Type    string `json:"type"`
	UserID  string `json:"user_id,omitempty"`
	QR      string `json:"qr,omitempty"`
	Message string `json:"message,omitempty"`
	Level   string `json:"level,omitempty"`
	Error   string `json:"error,omitempty"`
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

func emitLog(level, message string) {
	emitEvent(Event{Type: EventLog, Level: level, Message: message})
}

func emitError(err error) {
	if err == nil {
		return
	}
	emitEvent(Event{Type: EventError, Message: err.Error()})
}
