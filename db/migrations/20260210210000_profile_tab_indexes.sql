-- migrate:up

CREATE INDEX IF NOT EXISTS "Post_userId_createdAt_id_idx"
  ON "Post" ("userId", "createdAt" DESC, id DESC);

CREATE INDEX IF NOT EXISTS "Post_userId_title_createdAt_id_idx"
  ON "Post" ("userId", title, "createdAt" DESC, id DESC);

CREATE INDEX IF NOT EXISTS "Comment_userId_createdAt_id_idx"
  ON "Comment" ("userId", "createdAt" DESC, id DESC);

CREATE INDEX IF NOT EXISTS "Like_userId_postId_idx"
  ON "Like" ("userId", "postId");

CREATE INDEX IF NOT EXISTS "BookmarkPost_userId_createdAt_id_idx"
  ON "BookmarkPost" ("userId", "createdAt" DESC, id DESC);

-- migrate:down

DROP INDEX IF EXISTS "BookmarkPost_userId_createdAt_id_idx";
DROP INDEX IF EXISTS "Like_userId_postId_idx";
DROP INDEX IF EXISTS "Comment_userId_createdAt_id_idx";
DROP INDEX IF EXISTS "Post_userId_title_createdAt_id_idx";
DROP INDEX IF EXISTS "Post_userId_createdAt_id_idx";
