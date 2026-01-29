DROP TABLE closing;


CREATE TABLE closing (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL,
    owner_id TEXT NOT NULL,
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




DROP TABLE account_transaction;

CREATE TABLE account_transaction (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL,
    owner_id TEXT NOT NULL,
    ordering INT NOT NULL,
    account_id UUID NOT NULL,
    other_account_id UUID NOT NULL,
    amount NUMERIC NOT NULL,
    total_balance NUMERIC NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    transaction_id UUID,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES account(id) ON DELETE CASCADE,
    FOREIGN KEY (other_account_id) REFERENCES account(id) ON DELETE CASCADE,
    FOREIGN KEY (transaction_id) REFERENCES transaction(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE
);    

CREATE INDEX idx_account_transaction_project_id ON account_transaction(project_id);
CREATE INDEX idx_account_transaction_account_id ON account_transaction(account_id);
