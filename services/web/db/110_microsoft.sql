CREATE TABLE IF NOT EXISTS microsoft_token (
    owner_email TEXT PRIMARY KEY,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at INTEGER NOT NULL
);
