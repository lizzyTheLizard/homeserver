CREATE TABLE IF NOT EXISTS whatsapp_chats (
    our_jid         TEXT        NOT NULL,
    chat_jid        TEXT        NOT NULL,
    last_message_ts TIMESTAMPTZ NOT NULL,
    archived        BOOLEAN     NOT NULL DEFAULT FALSE,
    PRIMARY KEY (our_jid, chat_jid)
);
