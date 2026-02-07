-- migrate:up

DELETE FROM "Follows" f1
USING "Follows" f2
WHERE f1.ctid < f2.ctid
  AND f1."followerId" = f2."followerId"
  AND f1."followingId" = f2."followingId";

CREATE UNIQUE INDEX IF NOT EXISTS "Follows_followerId_followingId_key"
ON "Follows" ("followerId", "followingId");

-- migrate:down

DROP INDEX IF EXISTS "Follows_followerId_followingId_key";
