-- migrate:up

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS username TEXT;

UPDATE "User"
SET username = firstname
WHERE username IS NULL OR BTRIM(username) = '';

-- migrate:down

ALTER TABLE "User"
  DROP COLUMN IF EXISTS username;
