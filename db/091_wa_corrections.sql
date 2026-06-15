ALTER TABLE wa_chat ALTER COLUMN name DROP NOT NULL;
ALTER TABLE wa_chat ALTER COLUMN unread_count DROP NOT NULL;
ALTER TABLE wa_chat ALTER COLUMN archived DROP NOT NULL;

ALTER TABLE wa_contact DROP COLUMN phone_number;
ALTER TABLE wa_contact ALTER COLUMN name DROP NOT NULL;
ALTER TABLE wa_chat ADD COLUMN last_message_timestamp TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS wa_lid_mapping (
  lid          TEXT        PRIMARY KEY,
  pn           TEXT        NOT NULL,
  owner_email  TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);