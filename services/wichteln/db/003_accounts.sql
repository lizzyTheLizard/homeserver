-- Participants now have one account (name + password) for all their groups.
-- A participant row is the membership of an account in a group and holds the
-- wish and the selection. Existing groups and participants are not carried
-- over.
DELETE FROM wichteln_groups;

DROP TABLE wichteln_users;

CREATE TABLE wichteln_accounts (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX wichteln_accounts_name_idx ON wichteln_accounts (lower(name));

CREATE TABLE wichteln_participants (
    id UUID PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES wichteln_groups (id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES wichteln_accounts (id) ON DELETE CASCADE,
    wish_title TEXT,
    wish_description TEXT,
    selected_wish_of UUID REFERENCES wichteln_participants (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT wichteln_participants_wish_check CHECK ((wish_title IS NULL) = (wish_description IS NULL))
);

CREATE UNIQUE INDEX wichteln_participants_group_account_idx ON wichteln_participants (group_id, account_id);
CREATE INDEX wichteln_participants_account_id_idx ON wichteln_participants (account_id);
CREATE UNIQUE INDEX wichteln_participants_group_selected_idx ON wichteln_participants (group_id, selected_wish_of)
    WHERE selected_wish_of IS NOT NULL;
