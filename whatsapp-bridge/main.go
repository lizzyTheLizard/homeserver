// Command whatsapp is a multi-user WhatsApp bridge that exposes a REST API.
//
// It connects to WhatsApp via whatsmeow and stores messages in Postgres. The
// Next.js application talks to it over HTTP instead of spawning per-user child
// processes.
//
// Environment variables:
//   - DB_CONNECTION_STRING: Postgres connection string (required)
//   - DEV: "true" or "false" selects the device name in WhatsApp's linked devices list
//   - PORT: HTTP listen port (default 8080)
package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"time"

	"go.mau.fi/whatsmeow/store/sqlstore"
	waLog "go.mau.fi/whatsmeow/util/log"

	// Registers the "pgx" database/sql driver used by the whatsmeow store.
	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	connString := os.Getenv("DB_CONNECTION_STRING")
	if connString == "" {
		fmt.Fprintln(os.Stderr, "DB_CONNECTION_STRING is required")
		os.Exit(2)
	}

	dev, err := strconv.ParseBool(os.Getenv("DEV"))
	if err != nil {
		dev = false
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()

	db, err := sql.Open("pgx", connString)
	if err != nil {
		log.Fatalf("open database: %v", err)
	}
	defer db.Close()

	container := sqlstore.NewWithDB(db, "pgx", waLog.Noop)
	if err := container.Upgrade(ctx); err != nil {
		log.Fatalf("upgrade whatsmeow database: %v", err)
	}
	defer container.Close()

	server := NewServer(db, container, dev)

	mux := http.NewServeMux()
	server.RegisterRoutes(mux)

	srv := &http.Server{
		Addr:    ":" + port,
		Handler: mux,
	}

	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := srv.Shutdown(shutdownCtx); err != nil {
			log.Printf("server shutdown: %v", err)
		}
	}()

	log.Printf("WhatsApp bridge listening on :%s", port)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("listen: %v", err)
	}
}
