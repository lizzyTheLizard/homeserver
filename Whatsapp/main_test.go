package main

import (
	"context"
	"strings"
	"testing"

	"go.mau.fi/whatsmeow/proto/waE2E"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	"google.golang.org/protobuf/proto"
)

func TestParseJID(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    types.JID
		wantErr bool
	}{
		{name: "full user JID", input: "49123456789@s.whatsapp.net", want: types.NewJID("49123456789", types.DefaultUserServer)},
		{name: "group JID", input: "12345-6789@g.us", want: types.NewJID("12345-6789", types.GroupServer)},
		{name: "malformed JID", input: "1.2.3@s.whatsapp.net", wantErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := types.ParseJID(tt.input)
			if (err != nil) != tt.wantErr {
				t.Fatalf("ParseJID(%q) error = %v, wantErr %v", tt.input, err, tt.wantErr)
			}
			if !tt.wantErr && got != tt.want {
				t.Errorf("ParseJID(%q) = %v, want %v", tt.input, got, tt.want)
			}
		})
	}
}

func TestHandleCommandValidation(t *testing.T) {
	tests := []struct {
		name    string
		cmd     Command
		wantErr string
	}{
		{name: "unknown command", cmd: Command{Command: "nope"}, wantErr: `unknown command "nope"`},
		{name: "send_message without to", cmd: Command{Command: CmdSendMessage, Text: "hi"}, wantErr: "send_message: missing 'to'"},
		{name: "send_message without text", cmd: Command{Command: CmdSendMessage, To: "49123456789"}, wantErr: "send_message: missing 'text'"},
		{name: "archive_chat without id", cmd: Command{Command: CmdArchiveChat, Archived: boolPtr(true)}, wantErr: "archive_chat: missing 'id'"},
		{name: "archive_chat without archived", cmd: Command{Command: CmdArchiveChat, ID: "49123456789"}, wantErr: "archive_chat: missing 'archived'"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Validation errors are returned before the client is touched,
			// so a nil client is sufficient here.
			err := handleCommand(context.Background(), nil, nil, tt.cmd)
			if err == nil || !strings.Contains(err.Error(), tt.wantErr) {
				t.Errorf("handleCommand(%+v) error = %v, want substring %q", tt.cmd, err, tt.wantErr)
			}
		})
	}
}

func TestMessageType(t *testing.T) {
	tests := []struct {
		name string
		evt  *events.Message
		want string
	}{
		{name: "nil message", evt: &events.Message{}, want: "unknown"},
		{name: "plain text", evt: &events.Message{Message: &waE2E.Message{Conversation: proto.String("hi")}}, want: "text"},
		{name: "image", evt: &events.Message{Message: &waE2E.Message{ImageMessage: &waE2E.ImageMessage{}}}, want: "image"},
		{name: "reaction", evt: &events.Message{Message: &waE2E.Message{ReactionMessage: &waE2E.ReactionMessage{}}}, want: "reaction"},
		{name: "server type wins", evt: &events.Message{Info: types.MessageInfo{Type: "media"}, Message: &waE2E.Message{Conversation: proto.String("hi")}}, want: "media"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := messageType(tt.evt); got != tt.want {
				t.Errorf("messageType() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestMessageText(t *testing.T) {
	tests := []struct {
		name string
		msg  *waE2E.Message
		want string
	}{
		{name: "conversation", msg: &waE2E.Message{Conversation: proto.String("hello")}, want: "hello"},
		{name: "extended text", msg: &waE2E.Message{ExtendedTextMessage: &waE2E.ExtendedTextMessage{Text: proto.String("link")}}, want: "link"},
		{name: "image caption", msg: &waE2E.Message{ImageMessage: &waE2E.ImageMessage{Caption: proto.String("cap")}}, want: "cap"},
		{name: "no text", msg: &waE2E.Message{StickerMessage: &waE2E.StickerMessage{}}, want: ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := messageText(tt.msg); got != tt.want {
				t.Errorf("messageText() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestBuildInsertQuery(t *testing.T) {
	text := &waE2E.Message{Conversation: proto.String("hi")}
	msg := func(id string) *events.Message {
		return &events.Message{
			Info: types.MessageInfo{
				MessageSource: types.MessageSource{Chat: types.NewJID("49123", types.DefaultUserServer), Sender: types.NewJID("49456", types.DefaultUserServer)},
				ID:            types.MessageID(id),
			},
			Message: text,
		}
	}
	t.Run("empty when nothing storable", func(t *testing.T) {
		query, args := buildInsertQuery("owner", []*events.Message{{}, {Message: text}})
		if query != "" || args != nil {
			t.Errorf("buildInsertQuery() = (%q, %v), want empty", query, args)
		}
	})
	t.Run("single message", func(t *testing.T) {
		query, args := buildInsertQuery("owner", []*events.Message{msg("A")})
		if !strings.Contains(query, "($1,$2,$3,$4,$5,$6,$7,$8,$9)") || !strings.Contains(query, "ON CONFLICT") {
			t.Errorf("unexpected query: %q", query)
		}
		if len(args) != 9 || args[0] != "owner" || args[3] != "A" {
			t.Errorf("unexpected args: %v", args)
		}
	})
	t.Run("multiple messages share one statement", func(t *testing.T) {
		query, args := buildInsertQuery("owner", []*events.Message{msg("A"), {}, msg("B")})
		if !strings.Contains(query, "($1,$2,$3,$4,$5,$6,$7,$8,$9),($10,$11,$12,$13,$14,$15,$16,$17,$18)") {
			t.Errorf("unexpected query: %q", query)
		}
		if len(args) != 18 || args[3] != "A" || args[12] != "B" {
			t.Errorf("unexpected args: %v", args)
		}
	})
}

func boolPtr(b bool) *bool { return &b }
