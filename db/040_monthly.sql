CREATE TABLE monthly (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL,
    owner_id TEXT NOT NULL,
    period TEXT NOT NULL,
    shared_account_id UUID NOT NULL,
    neon_account_id UUID NOT NULL,
    credit_card_account_id UUID NOT NULL,
    state TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    neon_transactions JSON NOT NULL,
    shared_transactions JSON NOT NULL,
    FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE,
    FOREIGN KEY (shared_account_id) REFERENCES account(id) ON DELETE CASCADE,
    FOREIGN KEY (neon_account_id) REFERENCES account(id) ON DELETE CASCADE,
    FOREIGN KEY (credit_card_account_id) REFERENCES account(id) ON DELETE CASCADE
);
