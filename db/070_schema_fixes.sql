-- Schema integrity fixes:
-- 1. Backfill account_transaction.project_id from the originating transaction,
--    then add the missing foreign key.
-- 2. Replace the broken discussion.template_id FK (was SET NULL on a NOT NULL
--    column) with RESTRICT — deletion is handled in application code.
-- 3. Add missing indexes on owner_email columns that were never indexed.

-- 1. Backfill and FK for account_transaction.project_id
UPDATE account_transaction at
   SET project_id = t.project_id
  FROM transaction t
 WHERE at.transaction_id = t.id
   AND at.project_id = '00000000-0000-0000-0000-000000000000';

DELETE FROM account_transaction
 WHERE project_id = '00000000-0000-0000-0000-000000000000';

ALTER TABLE account_transaction
  ADD CONSTRAINT fk_account_transaction_project
  FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE;

-- 2. Fix discussion.template_id FK
ALTER TABLE discussion DROP CONSTRAINT discussion_template_id_fkey;
ALTER TABLE discussion
  ADD CONSTRAINT discussion_template_id_fkey
  FOREIGN KEY (template_id) REFERENCES template(id) ON DELETE RESTRICT;

-- 3. Missing indexes
CREATE INDEX idx_user_favorite_owner_email ON user_favorite(owner_email);
CREATE INDEX idx_command_owner_email ON command(owner_email);
