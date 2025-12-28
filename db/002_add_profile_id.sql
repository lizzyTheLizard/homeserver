DROP TABLE profile;

CREATE TABLE profile (
    id UUID PRIMARY KEY,
    language TEXT NOT NULL,
    text TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_profile_owner_id ON profile(owner_id);
