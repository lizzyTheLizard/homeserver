CREATE TABLE project (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    archived BOOLEAN NOT NULL,
    owner_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_project_owner_id ON project(owner_id);

CREATE TABLE account (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    archived BOOLEAN NOT NULL,
    owner_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE
);

CREATE INDEX idx_account_project_id ON account(project_id);

CREATE TABLE transaction (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL,
    credit_account_id UUID NOT NULL,
    debit_account_id UUID NOT NULL,
    amount NUMERIC NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (credit_account_id) REFERENCES account(id) ON DELETE CASCADE,
    FOREIGN KEY (debit_account_id) REFERENCES account(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE
);

CREATE INDEX idx_transaction_project_id ON transaction(project_id);
CREATE INDEX idx_transaction_credit_account_id ON transaction(credit_account_id);
CREATE INDEX idx_transaction_debit_account_id ON transaction(debit_account_id);

CREATE TABLE account_transaction (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL,
    ordering INT NOT NULL,
    account_id UUID NOT NULL,
    other_account_id UUID NOT NULL,
    amount NUMERIC NOT NULL,
    total_balance NUMERIC NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    transaction_id UUID NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES account(id) ON DELETE CASCADE,
    FOREIGN KEY (other_account_id) REFERENCES account(id) ON DELETE CASCADE,
    FOREIGN KEY (transaction_id) REFERENCES transaction(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE
);    

CREATE INDEX idx_account_transaction_project_id ON account_transaction(project_id);
CREATE INDEX idx_account_transaction_account_id ON account_transaction(account_id);

CREATE TABLE closing (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    capital_account_id UUID NOT NULL,
    profit_account_id UUID NOT NULL,
    profit NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE,
    FOREIGN KEY (capital_account_id) REFERENCES account(id) ON DELETE CASCADE,
    FOREIGN KEY (profit_account_id) REFERENCES account(id) ON DELETE CASCADE
);

CREATE INDEX idx_closing_project_id ON closing(project_id);
CREATE INDEX idx_closing_capital_account_id ON closing(capital_account_id);
CREATE INDEX idx_closing_profit_account_id ON closing(profit_account_id);
