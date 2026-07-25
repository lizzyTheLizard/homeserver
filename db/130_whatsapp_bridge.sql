CREATE TABLE IF NOT EXISTS whatsapp_users (
    email     TEXT NOT NULL PRIMARY KEY,
    device_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
    our_jid    TEXT        NOT NULL,
    chat_jid   TEXT        NOT NULL,
    sender_jid TEXT        NOT NULL,
    id         TEXT        NOT NULL,
    ts         TIMESTAMPTZ NOT NULL,
    type       TEXT        NOT NULL,
    text       TEXT,
    from_me    BOOLEAN     NOT NULL,
    raw        BYTEA,
    PRIMARY KEY (our_jid, chat_jid, id)
);

CREATE TABLE IF NOT EXISTS whatsapp_groups (
    our_jid    TEXT NOT NULL,
    group_jid  TEXT NOT NULL,
    group_name TEXT NOT NULL,
    PRIMARY KEY (our_jid, group_jid)
);
