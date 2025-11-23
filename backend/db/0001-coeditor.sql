CREATE TABLE template (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    language TEXT NOT NULL,
    text TEXT NOT NULL,
    parameters JSONB NOT NULL DEFAULT '[]',
    owner_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_template_owner_id ON template(owner_id);

CREATE TABLE discussion (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    text TEXT NOT NULL,
    parameters JSONB NOT NULL DEFAULT '{}',
    context TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    template_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES template(id) ON DELETE SET NULL
);

CREATE INDEX idx_discussion_owner_id ON discussion(owner_id);

CREATE TABLE command (
    id UUID PRIMARY KEY,
    discussion_id UUID NOT NULL,
    text TEXT NOT NULL,
    context TEXT NOT NULL,
    selection_start INT DEFAULT NULL,
    selection_end INT DEFAULT NULL,
    custom_command TEXT,
    predefined_command TEXT,
    result TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    time_duration_ms INT,
    FOREIGN KEY (discussion_id) REFERENCES discussion(id) ON DELETE CASCADE
);

CREATE INDEX idx_command_discussion_id ON command(discussion_id);