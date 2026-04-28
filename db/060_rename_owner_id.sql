-- Rename owner_id to owner_email everywhere. Email has always been the value
-- stored in this column; the new name reflects that.

ALTER TABLE template RENAME COLUMN owner_id TO owner_email;
ALTER INDEX idx_template_owner_id RENAME TO idx_template_owner_email;

ALTER TABLE discussion RENAME COLUMN owner_id TO owner_email;
ALTER INDEX idx_discussion_owner_id RENAME TO idx_discussion_owner_email;

ALTER TABLE command RENAME COLUMN owner_id TO owner_email;

ALTER TABLE profile RENAME COLUMN owner_id TO owner_email;
ALTER INDEX idx_profile_owner_id RENAME TO idx_profile_owner_email;

ALTER TABLE project RENAME COLUMN owner_id TO owner_email;
ALTER INDEX idx_project_owner_id RENAME TO idx_project_owner_email;

ALTER TABLE account RENAME COLUMN owner_id TO owner_email;

ALTER TABLE transaction RENAME COLUMN owner_id TO owner_email;

ALTER TABLE account_transaction RENAME COLUMN owner_id TO owner_email;

ALTER TABLE closing RENAME COLUMN owner_id TO owner_email;

ALTER TABLE monthly RENAME COLUMN owner_id TO owner_email;

ALTER TABLE user_favorite RENAME COLUMN owner_id TO owner_email;
