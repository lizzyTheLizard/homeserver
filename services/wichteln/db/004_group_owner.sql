-- A group can have an owner: an account that manages the group. Existing
-- groups keep all their data and simply have no owner; only the administrator
-- manages them until one is assigned.
ALTER TABLE wichteln_groups ADD COLUMN owner_account_id UUID REFERENCES wichteln_accounts (id) ON DELETE SET NULL;

CREATE INDEX wichteln_groups_owner_account_id_idx ON wichteln_groups (owner_account_id);
