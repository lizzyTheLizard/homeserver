CREATE TABLE wichteln_groups (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    phase TEXT NOT NULL DEFAULT 'wishes',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT wichteln_groups_phase_check CHECK (phase IN ('wishes', 'selection'))
);

CREATE TABLE wichteln_users (
    id UUID PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES wichteln_groups (id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    wish_title TEXT,
    wish_description TEXT,
    selected_wish_of UUID REFERENCES wichteln_users (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT wichteln_users_wish_check CHECK ((wish_title IS NULL) = (wish_description IS NULL))
);

CREATE INDEX wichteln_users_group_id_idx ON wichteln_users (group_id);
CREATE UNIQUE INDEX wichteln_users_group_name_idx ON wichteln_users (group_id, lower(name));
CREATE UNIQUE INDEX wichteln_users_group_selected_idx ON wichteln_users (group_id, selected_wish_of)
    WHERE selected_wish_of IS NOT NULL;
