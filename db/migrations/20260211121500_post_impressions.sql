-- migrate:up

ALTER TABLE "Post"
  ADD COLUMN IF NOT EXISTS "impressionCount" INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "PostImpression" (
  id TEXT PRIMARY KEY,
  "postId" TEXT NOT NULL,
  "viewerUserId" UUID NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE "PostImpression"
  ADD CONSTRAINT "PostImpression_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "Post"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "PostImpression"
  ADD CONSTRAINT "PostImpression_viewerUserId_fkey"
  FOREIGN KEY ("viewerUserId") REFERENCES "User"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "PostImpression_postId_viewerUserId_key"
  ON "PostImpression" ("postId", "viewerUserId");

CREATE INDEX IF NOT EXISTS "PostImpression_postId_createdAt_idx"
  ON "PostImpression" ("postId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "PostImpression_viewerUserId_createdAt_idx"
  ON "PostImpression" ("viewerUserId", "createdAt" DESC);

UPDATE "Post" p
SET "impressionCount" = src.cnt
FROM (
  SELECT "postId", COUNT(*)::int AS cnt
  FROM "PostImpression"
  GROUP BY "postId"
) src
WHERE p.id = src."postId";

UPDATE "Post"
SET "impressionCount" = 0
WHERE "impressionCount" IS NULL;

-- migrate:down

ALTER TABLE "PostImpression"
  DROP CONSTRAINT IF EXISTS "PostImpression_viewerUserId_fkey";

ALTER TABLE "PostImpression"
  DROP CONSTRAINT IF EXISTS "PostImpression_postId_fkey";

DROP INDEX IF EXISTS "PostImpression_viewerUserId_createdAt_idx";
DROP INDEX IF EXISTS "PostImpression_postId_createdAt_idx";
DROP INDEX IF EXISTS "PostImpression_postId_viewerUserId_key";
DROP TABLE IF EXISTS "PostImpression";

ALTER TABLE "Post"
  DROP COLUMN IF EXISTS "impressionCount";
