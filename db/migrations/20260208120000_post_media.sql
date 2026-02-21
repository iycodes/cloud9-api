-- migrate:up

CREATE TABLE IF NOT EXISTS "PostMedia" (
  id TEXT PRIMARY KEY,
  "postId" TEXT NOT NULL,
  url TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sortOrder" INT NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE "PostMedia"
  ADD CONSTRAINT "PostMedia_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "Post"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "PostMedia_postId_sortOrder_idx"
  ON "PostMedia" ("postId", "sortOrder");

-- migrate:down

DROP INDEX IF EXISTS "PostMedia_postId_sortOrder_idx";

ALTER TABLE "PostMedia"
  DROP CONSTRAINT IF EXISTS "PostMedia_postId_fkey";

DROP TABLE IF EXISTS "PostMedia";
