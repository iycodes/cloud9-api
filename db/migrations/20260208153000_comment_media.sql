-- migrate:up

ALTER TABLE "Comment"
  ALTER COLUMN body DROP NOT NULL;

CREATE TABLE IF NOT EXISTS "CommentMedia" (
  id TEXT PRIMARY KEY,
  "commentId" TEXT NOT NULL,
  url TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE "CommentMedia"
  ADD CONSTRAINT "CommentMedia_commentId_fkey"
  FOREIGN KEY ("commentId") REFERENCES "Comment"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "CommentMedia_commentId_key"
  ON "CommentMedia" ("commentId");

-- migrate:down

DROP INDEX IF EXISTS "CommentMedia_commentId_key";

ALTER TABLE "CommentMedia"
  DROP CONSTRAINT IF EXISTS "CommentMedia_commentId_fkey";

DROP TABLE IF EXISTS "CommentMedia";

UPDATE "Comment"
SET body = ''
WHERE body IS NULL;

ALTER TABLE "Comment"
  ALTER COLUMN body SET NOT NULL;
