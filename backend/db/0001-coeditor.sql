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
    owner_id TEXT NOT NULL,
    template_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES template(id) ON DELETE SET NULL
);