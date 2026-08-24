package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"

	"go.mau.fi/whatsmeow/store/sqlstore"
)

// Server manages all WhatsApp sessions and exposes them via HTTP.
type Server struct {
	db        *sql.DB
	container *sqlstore.Container
	dev       bool
	sessions  map[string]*Session
	mu        sync.RWMutex
}

// NewServer creates a new server instance.
func NewServer(db *sql.DB, container *sqlstore.Container, dev bool) *Server {
	return &Server{
		db:        db,
		container: container,
		dev:       dev,
		sessions:  make(map[string]*Session),
	}
}

// RegisterRoutes registers the server HTTP handlers on mux.
func (srv *Server) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /health", srv.handleHealth)
	mux.HandleFunc("POST /sessions/{userId}/start", srv.handleStart)
	mux.HandleFunc("GET /sessions/{userId}/status", srv.handleStatus)
	mux.HandleFunc("POST /sessions/{userId}/stop", srv.handleStop)
	mux.HandleFunc("POST /sessions/{userId}/send-message", srv.handleSendMessage)
	mux.HandleFunc("POST /sessions/{userId}/archive-chat", srv.handleArchiveChat)
	mux.HandleFunc("POST /sessions/{userId}/mark-chat-read", srv.handleMarkChatRead)
	mux.HandleFunc("POST /sessions/{userId}/full-sync", srv.handleFullSync)
	mux.HandleFunc("POST /sessions/{userId}/disconnect", srv.handleDisconnect)
	mux.HandleFunc("GET /sessions/{userId}/chats", srv.handleGetChats)
	mux.HandleFunc("GET /sessions/{userId}/messages", srv.handleGetMessages)
}

func (srv *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}

func (srv *Server) handleStart(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromRequestHelper(r)
	s := srv.getOrCreateSession(userID)
	status, err := s.Start(r.Context())
	if err != nil {
		writeErrorHelper(w, http.StatusServiceUnavailable, err.Error())
		return
	}
	writeJSONHelper(w, http.StatusOK, status)
}

func (srv *Server) handleStatus(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromRequestHelper(r)
	s, ok := srv.getSession(userID)
	if !ok {
		writeJSONHelper(w, http.StatusOK, StatusResponse{Type: string(statusClosed)})
		return
	}
	writeJSONHelper(w, http.StatusOK, s.GetStatus())
}

func (srv *Server) handleStop(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromRequestHelper(r)
	s, ok := srv.getSession(userID)
	if ok {
		s.close(fmt.Errorf("stopped by client"))
		srv.removeSession(userID)
	}
	w.WriteHeader(http.StatusNoContent)
}

func (srv *Server) handleSendMessage(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromRequestHelper(r)
	var req struct {
		To   string `json:"to"`
		Text string `json:"text"`
	}
	if !decodeJSONHelper(r, &req) {
		writeErrorHelper(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	s := srv.getOrCreateSession(userID)
	if err := s.SendMessage(r.Context(), req.To, req.Text); err != nil {
		writeErrorHelper(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (srv *Server) handleArchiveChat(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromRequestHelper(r)
	var req struct {
		ID       string `json:"id"`
		Archived bool   `json:"archived"`
	}
	if !decodeJSONHelper(r, &req) {
		writeErrorHelper(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	s := srv.getOrCreateSession(userID)
	if err := s.ArchiveChat(r.Context(), req.ID, req.Archived); err != nil {
		writeErrorHelper(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (srv *Server) handleMarkChatRead(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromRequestHelper(r)
	var req struct {
		ID string `json:"id"`
	}
	if !decodeJSONHelper(r, &req) {
		writeErrorHelper(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	s := srv.getOrCreateSession(userID)
	if err := s.MarkChatRead(r.Context(), req.ID); err != nil {
		writeErrorHelper(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (srv *Server) handleFullSync(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromRequestHelper(r)
	s := srv.getOrCreateSession(userID)
	if err := s.FullSync(r.Context()); err != nil {
		writeErrorHelper(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusAccepted)
}

func (srv *Server) handleDisconnect(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromRequestHelper(r)
	s := srv.getOrCreateSession(userID)
	if err := s.Disconnect(r.Context()); err != nil {
		writeErrorHelper(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (srv *Server) handleGetChats(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromRequestHelper(r)
	s := srv.getOrCreateSession(userID)
	chats, err := s.GetChats(r.Context())
	if err != nil {
		writeErrorHelper(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSONHelper(w, http.StatusOK, chats)
}

func (srv *Server) handleGetMessages(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromRequestHelper(r)
	chatID := r.URL.Query().Get("chatId")
	if chatID == "" {
		writeErrorHelper(w, http.StatusBadRequest, "missing chatId query parameter")
		return
	}
	s := srv.getOrCreateSession(userID)
	messages, err := s.GetMessages(r.Context(), chatID)
	if err != nil {
		writeErrorHelper(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSONHelper(w, http.StatusOK, messages)
}

func (srv *Server) getOrCreateSession(userID string) *Session {
	srv.mu.Lock()
	defer srv.mu.Unlock()
	if s, ok := srv.sessions[userID]; ok {
		return s
	}
	s := newSession(userID, srv)
	srv.sessions[userID] = s
	return s
}

func (srv *Server) getSession(userID string) (*Session, bool) {
	srv.mu.RLock()
	defer srv.mu.RUnlock()
	s, ok := srv.sessions[userID]
	return s, ok
}

func (srv *Server) removeSession(userID string) {
	srv.mu.Lock()
	defer srv.mu.Unlock()
	delete(srv.sessions, userID)
}

func writeJSONHelper(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeErrorHelper(w http.ResponseWriter, status int, message string) {
	writeJSONHelper(w, status, map[string]string{"error": message})
}

func decodeJSONHelper(r *http.Request, dst any) bool {
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		return false
	}
	return true
}

func userIDFromRequestHelper(r *http.Request) string {
	return r.PathValue("userId")
}
