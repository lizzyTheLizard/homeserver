DROP TABLE IF EXISTS wa_auth;
DROP TABLE IF EXISTS wa_contact;
DROP TABLE IF EXISTS wa_chat;
DROP TABLE IF EXISTS wa_message;

CREATE TABLE IF NOT EXISTS wa_auth (
    owner_email TEXT       NOT NULL PRIMARY KEY,
    auth        TEXT       NOT NULL
);

CREATE TABLE IF NOT EXISTS wa_data (
    owner_email TEXT        NOT NULL,
    type        TEXT        NOT NULL,
    id          TEXT        NOT NULL,
    obj         TEXT        NOT NULL,
    hash        TEXT        NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wa_data ON wa_data (owner_email);