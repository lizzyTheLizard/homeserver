package main

import (
	"log"
	"context"
	"fmt"
	"sync"
	"time"

	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/appstate"
	"go.mau.fi/whatsmeow/store"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	waLog "go.mau.fi/whatsmeow/util/log"

	"whatsapp/handlers"
)

// Status represents the current state of a user session.
type Status string

const (
	statusConnecting Status = "connecting"
	statusNeedAuth   Status = "needAuth"
	statusConnected  Status = "connected"
	statusFullSync   Status = "fullsync"
	statusClosed     Status = "closed"
)

// StatusResponse is returned by endpoints that expose session state.
type StatusResponse struct {
	Type  string `json:"type"`
	QR    string `json:"qr,omitempty"`
	Error string `json:"error,omitempty"`
}

type startupResult struct {
	status Status
	userID string
	qr     string
	err    error
}

// Session manages one user's WhatsApp connection.
type Session struct {
	userID    string
	server    *Server
	container *sqlstore.Container
	dev       bool

	mu            sync.RWMutex
	client        *whatsmeow.Client
	device        *store.Device
	status        Status
	qr            string
	userJID       string
	fullSyncError string
	cmdMutex      sync.Mutex

	startMu     sync.Mutex
	startCond   *sync.Cond
	startActive bool
}

func newSession(userID string, server *Server) *Session {
	s := &Session{
		userID:    userID,
		server:    server,
		container: server.container,
		dev:       server.dev,
		status:    statusConnecting,
	}
	s.startCond = sync.NewCond(&s.startMu)
	return s
}

// Start connects the session and waits until it is ready, needs auth, or fails.
func (s *Session) Start(ctx context.Context) (StatusResponse, error) {
	s.startMu.Lock()
	for s.startActive {
		s.startCond.Wait()
	}

	s.mu.RLock()
	currentStatus := s.status
	s.mu.RUnlock()

	if currentStatus != statusConnecting && currentStatus != statusClosed {
		s.startMu.Unlock()
		return s.GetStatus(), nil
	}

	s.startActive = true
	s.startMu.Unlock()

	result, err := s.startUnsafe(ctx)

	s.startMu.Lock()
	s.startActive = false
	s.startCond.Broadcast()
	s.startMu.Unlock()

	return result, err
}

func (s *Session) startUnsafe(ctx context.Context) (StatusResponse, error) {
	s.mu.Lock()
	s.status = statusConnecting
	s.mu.Unlock()

	startup := make(chan startupResult, 1)

	client, device, err := s.connect(ctx, startup)
	if err != nil {
		s.close(err)
		return StatusResponse{}, err
	}

	s.mu.Lock()
	s.client = client
	s.device = device
	s.mu.Unlock()

	select {
	case <-ctx.Done():
		s.close(ctx.Err())
		return StatusResponse{}, ctx.Err()
	case result := <-startup:
		if result.err != nil {
			s.close(result.err)
			return StatusResponse{}, result.err
		}
		s.mu.Lock()
		if s.status == statusClosed {
			s.mu.Unlock()
			return StatusResponse{}, fmt.Errorf("session closed during startup")
		}
		s.status = result.status
		s.userJID = result.userID
		if result.qr != "" {
			s.qr = result.qr
		}
		response := s.currentStatusLocked()
		s.mu.Unlock()
		return response, nil
	case <-time.After(60 * time.Second):
		s.close(fmt.Errorf("startup timed out"))
		return StatusResponse{}, fmt.Errorf("startup timed out")
	}
}

func (s *Session) ensureStarted(ctx context.Context) error {
	_, err := s.Start(ctx)
	return err
}

func (s *Session) connect(ctx context.Context, startup chan<- startupResult) (*whatsmeow.Client, *store.Device, error) {
	setClientName(s.dev)

	device, err := s.loadDevice(ctx)
	if err != nil {
		return nil, nil, err
	}

	client := whatsmeow.NewClient(device, waLog.Noop)
	client.AddEventHandler(func(evt any) { s.handleEvent(ctx, client, evt, startup) })

	var qrChan <-chan whatsmeow.QRChannelItem
	if client.Store.ID == nil {
		qrChan, err = client.GetQRChannel(ctx)
		if err != nil {
			return nil, nil, fmt.Errorf("open QR channel: %w", err)
		}
	}

	if err := client.Connect(); err != nil {
		return nil, nil, fmt.Errorf("connect to WhatsApp: %w", err)
	}

	if qrChan != nil {
		go s.handleQRChannel(qrChan, startup)
	}

	return client, device, nil
}

func (s *Session) loadDevice(ctx context.Context) (*store.Device, error) {
	deviceIDStr, err := GetDeviceID(ctx, s.server.db, s.userID)
	if err != nil {
		return nil, fmt.Errorf("lookup device for %s: %w", s.userID, err)
	}

	var device *store.Device
	if deviceIDStr != "" {
		jid, err := types.ParseJID(deviceIDStr)
		if err != nil {
			return nil, fmt.Errorf("parse device JID %q: %w", deviceIDStr, err)
		}
		device, err = s.container.GetDevice(ctx, jid)
		if err != nil {
			return nil, fmt.Errorf("load device %s: %w", deviceIDStr, err)
		}
	}
	if device == nil {
		device = s.container.NewDevice()
	}
	return device, nil
}

func (s *Session) handleQRChannel(qrChan <-chan whatsmeow.QRChannelItem, startup chan<- startupResult) {
	for item := range qrChan {
		switch item.Event {
		case whatsmeow.QRChannelEventCode:
			select {
			case startup <- startupResult{status: statusNeedAuth, qr: item.Code}:
			default:
			}
			s.mu.Lock()
			s.status = statusNeedAuth
			s.qr = item.Code
			s.mu.Unlock()
		case whatsmeow.QRChannelEventError:
			select {
			case startup <- startupResult{err: item.Error}:
			default:
			}
		case whatsmeow.QRChannelSuccess.Event:
			// Connection event will set the final status.
		case whatsmeow.QRChannelTimeout.Event:
			select {
			case startup <- startupResult{err: fmt.Errorf("QR pairing timed out")}:
			default:
			}
		default:
			select {
			case startup <- startupResult{err: fmt.Errorf("QR pairing failed: %s", item.Event)}:
			default:
			}
		}
	}
}

func (s *Session) handleEvent(ctx context.Context, client *whatsmeow.Client, evt any, startup chan<- startupResult) {
	switch evt := evt.(type) {
	case *events.Connected:
		if client.Store.ID == nil {
			log.Printf("[error] client.Store.ID is nil after connected event")
			return
		}
		connectedUser := client.Store.ID.String()
		if err := SaveDeviceID(ctx, s.server.db, s.userID, connectedUser); err != nil {
			log.Printf("[error] save device mapping: %v", err)
		} else {
			log.Printf("[debug] device mapping saved for %s", connectedUser)
		}
		if err := client.FetchAppState(ctx, appstate.WAPatchRegularLow, false, false); err != nil {
			log.Printf("[error] fetch app state: %v", err)
		} else {
			log.Printf("[debug] initial app state fetched")
		}
		select {
		case startup <- startupResult{status: statusConnected, userID: connectedUser}:
		default:
		}
		s.mu.Lock()
		s.status = statusConnected
		s.userJID = connectedUser
		s.mu.Unlock()
	case *events.Message:
		ourJID := client.Store.GetJID().String()
		if err := handlers.HandleMessageEvent(ctx, s.server.db, client, ourJID, evt); err != nil {
			log.Printf("[error] %s", err.Error())
		} else {
			log.Printf("[debug] message %s stored", evt.Info.ID)
		}
	case *events.GroupInfo:
		handlers.HandleGroupInfoEvent(ctx, s.server.db, client.Store.GetJID().String(), evt)
	case *events.JoinedGroup:
		handlers.HandleJoinedGroupEvent(ctx, s.server.db, client.Store.GetJID().String(), evt)
	case *events.HistorySync:
		ourJID := client.Store.GetJID().String()
		if err := handlers.HandleHistorySyncMessagesEvent(ctx, s.server.db, client, ourJID, evt.Data); err != nil {
			log.Printf("[error] store history sync: %v", err)
		}
		handlers.HandleHistorySyncGroupsEvent(ctx, s.server.db, ourJID, evt.Data)
	case *events.PairError:
		select {
		case startup <- startupResult{err: fmt.Errorf("pairing failed: %w", evt.Error)}:
		default:
		}
		log.Printf("[error] pairing failed: %v", evt.Error)
	case *events.Archive:
		if err := handlers.HandleArchiveEvent(ctx, s.server.db, client, evt); err != nil {
			log.Printf("[error] handle archive: %v", err)
		}
	case *events.AppStateSyncComplete:
		handlers.HandleAppStateSyncCompleteEvent(ctx, s.server.db, client, evt)
	case *events.LoggedOut:
		log.Printf("[warn] logged out (reason %d)", evt.Reason)
		if err := DeleteUserData(s.server.db, s.userID); err != nil {
			log.Printf("[error] delete user data after logout: %v", err)
		}
		s.close(fmt.Errorf("logged out: %d", evt.Reason))
	}
}

func (s *Session) GetStatus() StatusResponse {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.currentStatusLocked()
}

func (s *Session) currentStatusLocked() StatusResponse {
	resp := StatusResponse{Type: string(s.status)}
	switch s.status {
	case statusNeedAuth:
		resp.QR = s.qr
	case statusClosed:
		resp.Error = "session closed"
	}
	return resp
}

func (s *Session) SendMessage(ctx context.Context, to, text string) error {
	if err := s.ensureStarted(ctx); err != nil {
		return err
	}
	client, err := s.requireClient()
	if err != nil {
		return err
	}
	s.cmdMutex.Lock()
	defer s.cmdMutex.Unlock()
	return handlers.SendMessageRequest(ctx, client, to, text)
}

func (s *Session) ArchiveChat(ctx context.Context, id string, archived bool) error {
	if err := s.ensureStarted(ctx); err != nil {
		return err
	}
	client, err := s.requireClient()
	if err != nil {
		return err
	}
	s.cmdMutex.Lock()
	defer s.cmdMutex.Unlock()
	return handlers.ArchiveChatRequest(ctx, client, id, archived)
}

func (s *Session) MarkChatRead(ctx context.Context, id string) error {
	if err := s.ensureStarted(ctx); err != nil {
		return err
	}
	client, err := s.requireClient()
	if err != nil {
		return err
	}
	s.cmdMutex.Lock()
	defer s.cmdMutex.Unlock()
	return handlers.MarkChatReadRequest(ctx, client, id)
}

func (s *Session) FullSync(ctx context.Context) error {
	if err := s.ensureStarted(ctx); err != nil {
		return err
	}
	client, err := s.requireClient()
	if err != nil {
		return err
	}
	s.mu.Lock()
	s.status = statusFullSync
	s.fullSyncError = ""
	s.mu.Unlock()

	go func() {
		err := handlers.FullSyncRequest(ctx, client, s.server.db)
		s.mu.Lock()
		if err != nil {
			s.fullSyncError = err.Error()
		}
		if s.status == statusFullSync {
			s.status = statusConnected
		}
		s.mu.Unlock()
	}()
	return nil
}

func (s *Session) GetChats(ctx context.Context) ([]handlers.Chat, error) {
	if err := s.ensureStarted(ctx); err != nil {
		return nil, err
	}
	ourJID, err := s.requireUserJID()
	if err != nil {
		return nil, err
	}
	return handlers.GetChatsRequest(ctx, s.server.db, ourJID)
}

func (s *Session) GetMessages(ctx context.Context, chatID string) ([]handlers.Message, error) {
	if err := s.ensureStarted(ctx); err != nil {
		return nil, err
	}
	ourJID, err := s.requireUserJID()
	if err != nil {
		return nil, err
	}
	return handlers.GetMessagesRequest(ctx, s.server.db, ourJID, chatID)
}

func (s *Session) requireClient() (*whatsmeow.Client, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.client == nil {
		return nil, fmt.Errorf("session not started")
	}
	return s.client, nil
}

func (s *Session) requireUserJID() (string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.userJID == "" {
		return "", fmt.Errorf("session not connected")
	}
	return s.userJID, nil
}

func (s *Session) close(err error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.status == statusClosed {
		return
	}
	if s.client != nil {
		s.client.Disconnect()
	}
	s.status = statusClosed
	s.server.removeSession(s.userID)
}

func setClientName(dev bool) {
	name := "Gutschi.Site"
	if dev {
		name = "Gutschi.Site (dev)"
	}
	store.SetOSInfo(name, [3]uint32{1, 0, 0})
}
