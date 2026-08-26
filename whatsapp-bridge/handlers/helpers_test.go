package handlers

import (
	"context"
	"database/sql"
	"os"
	"strings"
	"testing"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

// openTestDB opens the Postgres database used by the integration tests. The
// tests require a live database (the same schema the bridge uses), so when one
// is not reachable — e.g. in CI, which does not provision Postgres for the
// bridge — the test is skipped instead of failing or hanging on a connection
// attempt. A short connect timeout guarantees the skip happens quickly.
func openTestDB(t *testing.T) *sql.DB {
	t.Helper()
	dsn := os.Getenv("DB_CONNECTION_STRING")
	if dsn == "" {
		dsn = "postgres://homeserver:homeserver@postgresdev:5432/homeserver?sslmode=disable"
	}
	if !strings.Contains(dsn, "connect_timeout") {
		if strings.Contains(dsn, "?") {
			dsn += "&connect_timeout=5"
		} else {
			dsn += "?connect_timeout=5"
		}
	}

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		t.Skipf("skipping: cannot open database: %v", err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		db.Close()
		t.Skipf("skipping: postgres not reachable: %v", err)
	}
	return db
}
