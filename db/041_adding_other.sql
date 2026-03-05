TRUNCATE TABLE monthly;
ALTER TABLE monthly ADD COLUMN remaining_account_id UUID NOT NULL;
ALTER TABLE monthly ADD FOREIGN KEY (remaining_account_id) REFERENCES account(id) ON DELETE CASCADE;
