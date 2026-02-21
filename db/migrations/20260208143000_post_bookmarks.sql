-- migrate:up

CREATE TABLE IF NOT EXISTS "BookmarkPost" (
  id TEXT PRIMARY KEY,
  "userId" UUID NOT NULL,
  "postId" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE "BookmarkPost"
  ADD CONSTRAINT "BookmarkPost_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "BookmarkPost"
  ADD CONSTRAINT "BookmarkPost_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "Post"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "BookmarkPost_userId_postId_key"
  ON "BookmarkPost" ("userId", "postId");

CREATE INDEX IF NOT EXISTS "BookmarkPost_userId_createdAt_idx"
  ON "BookmarkPost" ("userId", "createdAt" DESC);

-- migrate:down

DROP INDEX IF EXISTS "BookmarkPost_userId_createdAt_idx";
DROP INDEX IF EXISTS "BookmarkPost_userId_postId_key";

ALTER TABLE "BookmarkPost"
  DROP CONSTRAINT IF EXISTS "BookmarkPost_postId_fkey";

ALTER TABLE "BookmarkPost"
  DROP CONSTRAINT IF EXISTS "BookmarkPost_userId_fkey";

DROP TABLE IF EXISTS "BookmarkPost";
