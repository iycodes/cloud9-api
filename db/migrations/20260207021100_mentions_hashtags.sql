-- migrate:up

CREATE TABLE IF NOT EXISTS "Hashtag" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  "nameNormalized" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "PostHashtag" (
  id TEXT PRIMARY KEY,
  "postId" TEXT NOT NULL REFERENCES "Post"(id) ON DELETE CASCADE,
  "hashtagId" TEXT NOT NULL REFERENCES "Hashtag"(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE ("postId", "hashtagId")
);

CREATE TABLE IF NOT EXISTS "CommentHashtag" (
  id TEXT PRIMARY KEY,
  "commentId" TEXT NOT NULL REFERENCES "Comment"(id) ON DELETE CASCADE,
  "hashtagId" TEXT NOT NULL REFERENCES "Hashtag"(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE ("commentId", "hashtagId")
);

CREATE TABLE IF NOT EXISTS "PostMention" (
  id TEXT PRIMARY KEY,
  "postId" TEXT NOT NULL REFERENCES "Post"(id) ON DELETE CASCADE,
  "mentionedUserId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "authorUserId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  "startIndex" INT NOT NULL,
  "endIndex" INT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE ("postId", "mentionedUserId", "startIndex", "endIndex")
);

CREATE TABLE IF NOT EXISTS "CommentMention" (
  id TEXT PRIMARY KEY,
  "commentId" TEXT NOT NULL REFERENCES "Comment"(id) ON DELETE CASCADE,
  "mentionedUserId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "authorUserId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  "startIndex" INT NOT NULL,
  "endIndex" INT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE ("commentId", "mentionedUserId", "startIndex", "endIndex")
);

CREATE INDEX IF NOT EXISTS "Hashtag_nameNormalized_idx"
ON "Hashtag" ("nameNormalized");

CREATE INDEX IF NOT EXISTS "PostHashtag_hashtagId_postId_idx"
ON "PostHashtag" ("hashtagId", "postId");

CREATE INDEX IF NOT EXISTS "CommentHashtag_hashtagId_commentId_idx"
ON "CommentHashtag" ("hashtagId", "commentId");

CREATE INDEX IF NOT EXISTS "PostMention_mentionedUserId_createdAt_idx"
ON "PostMention" ("mentionedUserId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "CommentMention_mentionedUserId_createdAt_idx"
ON "CommentMention" ("mentionedUserId", "createdAt" DESC);

-- migrate:down

DROP INDEX IF EXISTS "CommentMention_mentionedUserId_createdAt_idx";
DROP INDEX IF EXISTS "PostMention_mentionedUserId_createdAt_idx";
DROP INDEX IF EXISTS "CommentHashtag_hashtagId_commentId_idx";
DROP INDEX IF EXISTS "PostHashtag_hashtagId_postId_idx";
DROP INDEX IF EXISTS "Hashtag_nameNormalized_idx";

DROP TABLE IF EXISTS "CommentMention";
DROP TABLE IF EXISTS "PostMention";
DROP TABLE IF EXISTS "CommentHashtag";
DROP TABLE IF EXISTS "PostHashtag";
DROP TABLE IF EXISTS "Hashtag";
