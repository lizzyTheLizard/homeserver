-- Participants now register themselves through a per-group invite link and
-- choose their own password, stored only as a hash. Existing groups are not
-- carried over (deleting groups cascades to their participants).
DELETE FROM wichteln_groups;

ALTER TABLE wichteln_groups ADD COLUMN invite_token TEXT NOT NULL;

CREATE UNIQUE INDEX wichteln_groups_invite_token_idx ON wichteln_groups (invite_token);

ALTER TABLE wichteln_users RENAME COLUMN password TO password_hash;
