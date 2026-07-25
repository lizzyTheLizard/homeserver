package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"sync"
	"time"

	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/appstate"
)

func fullSync(ctx context.Context, client *whatsmeow.Client, db *sql.DB) error {
	if client.Store.ID == nil {
		return errors.New("full_sync: not connected")
	}
	start := time.Now()
	emitLog("debug", "full sync started")

	prog := newProgress("syncing contacts")
	defer prog.stop()

	if err := timedStep(prog, "contacts synced", "syncing contacts", func() error {
		return client.FetchAppState(ctx, appstate.WAPatchCriticalUnblockLow, true, false)
	}); err != nil {
		return fmt.Errorf("full_sync: fetch critical app state: %w", err)
	}

	if err := timedStep(prog, "archived chats synced", "syncing archived", func() error {
		return client.FetchAppState(ctx, appstate.WAPatchRegularLow, true, false)
	}); err != nil {
		return fmt.Errorf("full_sync: fetch regular app state: %w", err)
	}

	if err := timedStep(prog, "groups synced", "syncing groups", func() error {
		return syncJoinedGroups(ctx, client, db)
	}); err != nil {
		return fmt.Errorf("full_sync: sync groups: %w", err)
	}

	emitLog("info", fmt.Sprintf("full sync completed (total took %s)", time.Since(start).Round(time.Millisecond)))
	emitEvent(Event{Type: EventFullSyncFinished})
	return nil
}

type progress struct {
	mu    sync.Mutex
	state string
	start time.Time
	done  chan struct{}
}

func newProgress(initialState string) *progress {
	p := &progress{
		state: initialState,
		start: time.Now(),
		done:  make(chan struct{}),
	}
	go p.run()
	return p
}

func (p *progress) set(state string) {
	p.mu.Lock()
	p.state = state
	p.mu.Unlock()
}

func (p *progress) run() {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-p.done:
			return
		case <-ticker.C:
			p.mu.Lock()
			s := p.state
			p.mu.Unlock()
			emitLog("debug", fmt.Sprintf("full sync still running after %s (%s)", time.Since(p.start).Round(time.Second), s))
		}
	}
}

func (p *progress) stop() {
	close(p.done)
}

func timedStep(p *progress, label, progressState string, fn func() error) error {
	p.set(progressState)
	start := time.Now()
	if err := fn(); err != nil {
		return err
	}
	emitLog("debug", fmt.Sprintf("%s (step took %s)", label, time.Since(start).Round(time.Millisecond)))
	return nil
}
