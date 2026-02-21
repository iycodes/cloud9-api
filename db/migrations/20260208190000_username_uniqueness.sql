-- migrate:up

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS username TEXT;

WITH normalized AS (
  SELECT
    id,
    COALESCE(
      NULLIF(
        LOWER(
          REGEXP_REPLACE(
            BTRIM(COALESCE(username, firstname, '')),
            '[^a-zA-Z0-9_.]',
            '',
            'g'
          )
        ),
        ''
      ),
      CONCAT('user', SUBSTRING(REPLACE(id::text, '-', '') FROM 1 FOR 8))
    ) AS base_username
  FROM "User"
),
ranked AS (
  SELECT
    id,
    base_username,
    ROW_NUMBER() OVER (PARTITION BY base_username ORDER BY id) AS rn
  FROM normalized
),
finalized AS (
  SELECT
    id,
    CASE
      WHEN rn = 1 THEN LEFT(base_username, 30)
      ELSE CONCAT(
        LEFT(base_username, 21),
        '_',
        SUBSTRING(REPLACE(id::text, '-', '') FROM 1 FOR 8)
      )
    END AS final_username
  FROM ranked
)
UPDATE "User" u
SET username = f.final_username
FROM finalized f
WHERE u.id = f.id;

ALTER TABLE "User"
  ALTER COLUMN username SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key"
  ON "User" (LOWER(username));

-- migrate:down

DROP INDEX IF EXISTS "User_username_key";

ALTER TABLE "User"
  ALTER COLUMN username DROP NOT NULL;
