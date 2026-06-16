CREATE TABLE IF NOT EXISTS wa_auth (
  owner_email TEXT PRIMARY KEY,
  creds       TEXT NOT NULL,
  keys        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wa_auth_owner_email ON wa_auth (owner_email);

CREATE TABLE IF NOT EXISTS wa_contact (
  lid          TEXT        PRIMARY KEY,
  pn           TEXT        DEFAULT NULL,
  owner_email  TEXT        NOT NULL,
  name         TEXT        DEFAULT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wa_chat (
  id           TEXT        PRIMARY KEY,
  pn            TEXT        DEFAULT NULL,
  owner_email   TEXT        NOT NULL,
  name          TEXT        DEFAULT NULL,
  is_group      BOOLEAN     NOT NULL DEFAULT FALSE,
  unread_count  INTEGER     DEFAULT NULL,
  archived      BOOLEAN     DEFAULT NULL,
  last_message_timestamp TIMESTAMPTZ DEFAULT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_chat_owner_archived ON wa_chat (owner_email, archived);

CREATE TABLE IF NOT EXISTS wa_message (
  id          TEXT        PRIMARY KEY,
  chat_id     TEXT        NOT NULL,
  owner_email TEXT        NOT NULL,
  sender_id   TEXT        DEFAULT NULL,
  mentioned   BOOLEAN     NOT NULL DEFAULT FALSE,
  content     TEXT,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);




