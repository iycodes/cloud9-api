-- migrate:up

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
    CREATE TYPE "Role" AS ENUM ('BASIC', 'ADMIN');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "UserSettings" (
  id TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS "User" (
  id TEXT PRIMARY KEY,
  "userSettingsId" TEXT,
  "coverImageSrc" TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  "profileImageSrc" TEXT,
  website TEXT,
  gender TEXT NOT NULL,
  "displayName" TEXT,
  firstname TEXT NOT NULL,
  lastname TEXT NOT NULL,
  bio TEXT,
  birthday TEXT,
  region TEXT,
  password TEXT NOT NULL,
  "isEmailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
  "confirmationToken" TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS "Post" (
  id TEXT PRIMARY KEY,
  body TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "userId" TEXT NOT NULL,
  title TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ogPostId" TEXT,
  "displayName" TEXT
);

CREATE TABLE IF NOT EXISTS "Comment" (
  id TEXT PRIMARY KEY,
  body TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "userId" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "parentId" TEXT,
  title TEXT NOT NULL DEFAULT 'COMMENT',
  "displayName" TEXT
);

CREATE TABLE IF NOT EXISTS "Like" (
  "userId" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  id TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS "LikeComment" (
  "userId" TEXT NOT NULL,
  "commentId" TEXT NOT NULL,
  id TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS "Follows" (
  "followerId" TEXT NOT NULL,
  "followingId" TEXT NOT NULL,
  id TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS "BroadcastPost" (
  "userId" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  id TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS "BroadcastComment" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "commentId" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "Hashtag" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  "nameNormalized" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "PostHashtag" (
  id TEXT PRIMARY KEY,
  "postId" TEXT NOT NULL,
  "hashtagId" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE ("postId", "hashtagId")
);

CREATE TABLE IF NOT EXISTS "CommentHashtag" (
  id TEXT PRIMARY KEY,
  "commentId" TEXT NOT NULL,
  "hashtagId" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE ("commentId", "hashtagId")
);

CREATE TABLE IF NOT EXISTS "PostMention" (
  id TEXT PRIMARY KEY,
  "postId" TEXT NOT NULL,
  "mentionedUserId" TEXT NOT NULL,
  "authorUserId" TEXT NOT NULL,
  token TEXT NOT NULL,
  "startIndex" INT NOT NULL,
  "endIndex" INT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE ("postId", "mentionedUserId", "startIndex", "endIndex")
);

CREATE TABLE IF NOT EXISTS "CommentMention" (
  id TEXT PRIMARY KEY,
  "commentId" TEXT NOT NULL,
  "mentionedUserId" TEXT NOT NULL,
  "authorUserId" TEXT NOT NULL,
  token TEXT NOT NULL,
  "startIndex" INT NOT NULL,
  "endIndex" INT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE ("commentId", "mentionedUserId", "startIndex", "endIndex")
);

CREATE TABLE IF NOT EXISTS "MentionNotification" (
  id TEXT PRIMARY KEY,
  "recipientUserId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL CHECK ("entityType" IN ('post', 'comment')),
  "entityId" TEXT NOT NULL,
  "isRead" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE ("recipientUserId", "actorUserId", "entityType", "entityId")
);

CREATE TABLE IF NOT EXISTS "FollowNotification" (
  id TEXT PRIMARY KEY,
  "recipientUserId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "isRead" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE ("recipientUserId", "actorUserId")
);

ALTER TABLE "User"
  ADD CONSTRAINT "User_userSettingsId_fkey"
  FOREIGN KEY ("userSettingsId") REFERENCES "UserSettings"(id)
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "Post"
  ADD CONSTRAINT "Post_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"(id)
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE "Comment"
  ADD CONSTRAINT "Comment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "Comment"
  ADD CONSTRAINT "Comment_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "Post"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "Comment"
  ADD CONSTRAINT "Comment_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "Comment"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "Like"
  ADD CONSTRAINT "Like_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "Like"
  ADD CONSTRAINT "Like_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "Post"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "LikeComment"
  ADD CONSTRAINT "LikeComment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "LikeComment"
  ADD CONSTRAINT "LikeComment_commentId_fkey"
  FOREIGN KEY ("commentId") REFERENCES "Comment"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "Follows"
  ADD CONSTRAINT "Follows_followerId_fkey"
  FOREIGN KEY ("followerId") REFERENCES "User"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "Follows"
  ADD CONSTRAINT "Follows_followingId_fkey"
  FOREIGN KEY ("followingId") REFERENCES "User"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "BroadcastPost"
  ADD CONSTRAINT "BroadcastPost_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "BroadcastPost"
  ADD CONSTRAINT "BroadcastPost_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "Post"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "BroadcastComment"
  ADD CONSTRAINT "BroadcastComment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "BroadcastComment"
  ADD CONSTRAINT "BroadcastComment_commentId_fkey"
  FOREIGN KEY ("commentId") REFERENCES "Comment"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "PostHashtag"
  ADD CONSTRAINT "PostHashtag_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "Post"(id)
  ON DELETE CASCADE;

ALTER TABLE "PostHashtag"
  ADD CONSTRAINT "PostHashtag_hashtagId_fkey"
  FOREIGN KEY ("hashtagId") REFERENCES "Hashtag"(id)
  ON DELETE CASCADE;

ALTER TABLE "CommentHashtag"
  ADD CONSTRAINT "CommentHashtag_commentId_fkey"
  FOREIGN KEY ("commentId") REFERENCES "Comment"(id)
  ON DELETE CASCADE;

ALTER TABLE "CommentHashtag"
  ADD CONSTRAINT "CommentHashtag_hashtagId_fkey"
  FOREIGN KEY ("hashtagId") REFERENCES "Hashtag"(id)
  ON DELETE CASCADE;

ALTER TABLE "PostMention"
  ADD CONSTRAINT "PostMention_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "Post"(id)
  ON DELETE CASCADE;

ALTER TABLE "PostMention"
  ADD CONSTRAINT "PostMention_mentionedUserId_fkey"
  FOREIGN KEY ("mentionedUserId") REFERENCES "User"(id)
  ON DELETE CASCADE;

ALTER TABLE "PostMention"
  ADD CONSTRAINT "PostMention_authorUserId_fkey"
  FOREIGN KEY ("authorUserId") REFERENCES "User"(id)
  ON DELETE CASCADE;

ALTER TABLE "CommentMention"
  ADD CONSTRAINT "CommentMention_commentId_fkey"
  FOREIGN KEY ("commentId") REFERENCES "Comment"(id)
  ON DELETE CASCADE;

ALTER TABLE "CommentMention"
  ADD CONSTRAINT "CommentMention_mentionedUserId_fkey"
  FOREIGN KEY ("mentionedUserId") REFERENCES "User"(id)
  ON DELETE CASCADE;

ALTER TABLE "CommentMention"
  ADD CONSTRAINT "CommentMention_authorUserId_fkey"
  FOREIGN KEY ("authorUserId") REFERENCES "User"(id)
  ON DELETE CASCADE;

ALTER TABLE "MentionNotification"
  ADD CONSTRAINT "MentionNotification_recipientUserId_fkey"
  FOREIGN KEY ("recipientUserId") REFERENCES "User"(id)
  ON DELETE CASCADE;

ALTER TABLE "MentionNotification"
  ADD CONSTRAINT "MentionNotification_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"(id)
  ON DELETE CASCADE;

ALTER TABLE "FollowNotification"
  ADD CONSTRAINT "FollowNotification_recipientUserId_fkey"
  FOREIGN KEY ("recipientUserId") REFERENCES "User"(id)
  ON DELETE CASCADE;

ALTER TABLE "FollowNotification"
  ADD CONSTRAINT "FollowNotification_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"(id)
  ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"(email);
CREATE UNIQUE INDEX IF NOT EXISTS "User_userSettingsId_key" ON "User"("userSettingsId");
CREATE UNIQUE INDEX IF NOT EXISTS "Follows_followerId_followingId_key"
  ON "Follows" ("followerId", "followingId");
CREATE INDEX IF NOT EXISTS "Hashtag_nameNormalized_idx" ON "Hashtag" ("nameNormalized");
CREATE INDEX IF NOT EXISTS "PostHashtag_hashtagId_postId_idx"
  ON "PostHashtag" ("hashtagId", "postId");
CREATE INDEX IF NOT EXISTS "CommentHashtag_hashtagId_commentId_idx"
  ON "CommentHashtag" ("hashtagId", "commentId");
CREATE INDEX IF NOT EXISTS "PostMention_mentionedUserId_createdAt_idx"
  ON "PostMention" ("mentionedUserId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "CommentMention_mentionedUserId_createdAt_idx"
  ON "CommentMention" ("mentionedUserId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "MentionNotification_recipient_createdAt_idx"
  ON "MentionNotification" ("recipientUserId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "MentionNotification_recipient_unread_createdAt_idx"
  ON "MentionNotification" ("recipientUserId", "isRead", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "FollowNotification_recipient_createdAt_idx"
  ON "FollowNotification" ("recipientUserId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "FollowNotification_recipient_unread_createdAt_idx"
  ON "FollowNotification" ("recipientUserId", "isRead", "createdAt" DESC);

-- migrate:down

DROP TABLE IF EXISTS "FollowNotification";
DROP TABLE IF EXISTS "MentionNotification";
DROP TABLE IF EXISTS "CommentMention";
DROP TABLE IF EXISTS "PostMention";
DROP TABLE IF EXISTS "CommentHashtag";
DROP TABLE IF EXISTS "PostHashtag";
DROP TABLE IF EXISTS "Hashtag";
DROP TABLE IF EXISTS "BroadcastComment";
DROP TABLE IF EXISTS "BroadcastPost";
DROP TABLE IF EXISTS "Follows";
DROP TABLE IF EXISTS "LikeComment";
DROP TABLE IF EXISTS "Like";
DROP TABLE IF EXISTS "Comment";
DROP TABLE IF EXISTS "Post";
DROP TABLE IF EXISTS "User";
DROP TABLE IF EXISTS "UserSettings";

DROP TYPE IF EXISTS "Role";

