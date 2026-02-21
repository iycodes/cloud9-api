-- migrate:up

WITH ranked_likes AS (
  SELECT
    ctid,
    ROW_NUMBER() OVER (
      PARTITION BY "userId", "postId"
      ORDER BY id
    ) AS row_number
  FROM "Like"
)
DELETE FROM "Like" l
USING ranked_likes r
WHERE l.ctid = r.ctid
  AND r.row_number > 1;

WITH ranked_reposts AS (
  SELECT
    ctid,
    ROW_NUMBER() OVER (
      PARTITION BY "userId", "postId"
      ORDER BY id
    ) AS row_number
  FROM "BroadcastPost"
)
DELETE FROM "BroadcastPost" bp
USING ranked_reposts r
WHERE bp.ctid = r.ctid
  AND r.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "Like_userId_postId_key"
  ON "Like" ("userId", "postId");

CREATE UNIQUE INDEX IF NOT EXISTS "BroadcastPost_userId_postId_key"
  ON "BroadcastPost" ("userId", "postId");

CREATE INDEX IF NOT EXISTS "Like_postId_idx"
  ON "Like" ("postId");

CREATE INDEX IF NOT EXISTS "BroadcastPost_postId_idx"
  ON "BroadcastPost" ("postId");

CREATE INDEX IF NOT EXISTS "BookmarkPost_postId_idx"
  ON "BookmarkPost" ("postId");

-- migrate:down

DROP INDEX IF EXISTS "BookmarkPost_postId_idx";
DROP INDEX IF EXISTS "BroadcastPost_postId_idx";
DROP INDEX IF EXISTS "Like_postId_idx";
DROP INDEX IF EXISTS "BroadcastPost_userId_postId_key";
DROP INDEX IF EXISTS "Like_userId_postId_key";
