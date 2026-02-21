-- migrate:up

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE "Post" DROP CONSTRAINT IF EXISTS "Post_userId_fkey";
ALTER TABLE "Comment" DROP CONSTRAINT IF EXISTS "Comment_userId_fkey";
ALTER TABLE "Follows" DROP CONSTRAINT IF EXISTS "Follows_followerId_fkey";
ALTER TABLE "Follows" DROP CONSTRAINT IF EXISTS "Follows_followingId_fkey";
ALTER TABLE "Like" DROP CONSTRAINT IF EXISTS "Like_userId_fkey";
ALTER TABLE "LikeComment" DROP CONSTRAINT IF EXISTS "LikeComment_userId_fkey";
ALTER TABLE "BroadcastPost" DROP CONSTRAINT IF EXISTS "BroadcastPost_userId_fkey";
ALTER TABLE "BroadcastComment" DROP CONSTRAINT IF EXISTS "BroadcastComment_userId_fkey";
ALTER TABLE "PostMention" DROP CONSTRAINT IF EXISTS "PostMention_mentionedUserId_fkey";
ALTER TABLE "PostMention" DROP CONSTRAINT IF EXISTS "PostMention_authorUserId_fkey";
ALTER TABLE "CommentMention" DROP CONSTRAINT IF EXISTS "CommentMention_mentionedUserId_fkey";
ALTER TABLE "CommentMention" DROP CONSTRAINT IF EXISTS "CommentMention_authorUserId_fkey";
ALTER TABLE "MentionNotification" DROP CONSTRAINT IF EXISTS "MentionNotification_recipientUserId_fkey";
ALTER TABLE "MentionNotification" DROP CONSTRAINT IF EXISTS "MentionNotification_actorUserId_fkey";
ALTER TABLE "FollowNotification" DROP CONSTRAINT IF EXISTS "FollowNotification_recipientUserId_fkey";
ALTER TABLE "FollowNotification" DROP CONSTRAINT IF EXISTS "FollowNotification_actorUserId_fkey";

ALTER TABLE "User"
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE "Post" ALTER COLUMN "userId" TYPE UUID USING "userId"::uuid;
ALTER TABLE "Comment" ALTER COLUMN "userId" TYPE UUID USING "userId"::uuid;
ALTER TABLE "Follows" ALTER COLUMN "followerId" TYPE UUID USING "followerId"::uuid;
ALTER TABLE "Follows" ALTER COLUMN "followingId" TYPE UUID USING "followingId"::uuid;
ALTER TABLE "Like" ALTER COLUMN "userId" TYPE UUID USING "userId"::uuid;
ALTER TABLE "LikeComment" ALTER COLUMN "userId" TYPE UUID USING "userId"::uuid;
ALTER TABLE "BroadcastPost" ALTER COLUMN "userId" TYPE UUID USING "userId"::uuid;
ALTER TABLE "BroadcastComment" ALTER COLUMN "userId" TYPE UUID USING "userId"::uuid;
ALTER TABLE "PostMention" ALTER COLUMN "mentionedUserId" TYPE UUID USING "mentionedUserId"::uuid;
ALTER TABLE "PostMention" ALTER COLUMN "authorUserId" TYPE UUID USING "authorUserId"::uuid;
ALTER TABLE "CommentMention" ALTER COLUMN "mentionedUserId" TYPE UUID USING "mentionedUserId"::uuid;
ALTER TABLE "CommentMention" ALTER COLUMN "authorUserId" TYPE UUID USING "authorUserId"::uuid;
ALTER TABLE "MentionNotification" ALTER COLUMN "recipientUserId" TYPE UUID USING "recipientUserId"::uuid;
ALTER TABLE "MentionNotification" ALTER COLUMN "actorUserId" TYPE UUID USING "actorUserId"::uuid;
ALTER TABLE "FollowNotification" ALTER COLUMN "recipientUserId" TYPE UUID USING "recipientUserId"::uuid;
ALTER TABLE "FollowNotification" ALTER COLUMN "actorUserId" TYPE UUID USING "actorUserId"::uuid;

ALTER TABLE "Post"
  ADD CONSTRAINT "Post_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"(id)
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE "Comment"
  ADD CONSTRAINT "Comment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "Follows"
  ADD CONSTRAINT "Follows_followerId_fkey"
  FOREIGN KEY ("followerId") REFERENCES "User"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "Follows"
  ADD CONSTRAINT "Follows_followingId_fkey"
  FOREIGN KEY ("followingId") REFERENCES "User"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "Like"
  ADD CONSTRAINT "Like_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "LikeComment"
  ADD CONSTRAINT "LikeComment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "BroadcastPost"
  ADD CONSTRAINT "BroadcastPost_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "BroadcastComment"
  ADD CONSTRAINT "BroadcastComment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "PostMention"
  ADD CONSTRAINT "PostMention_mentionedUserId_fkey"
  FOREIGN KEY ("mentionedUserId") REFERENCES "User"(id)
  ON DELETE CASCADE;

ALTER TABLE "PostMention"
  ADD CONSTRAINT "PostMention_authorUserId_fkey"
  FOREIGN KEY ("authorUserId") REFERENCES "User"(id)
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

-- migrate:down

ALTER TABLE "Post" DROP CONSTRAINT IF EXISTS "Post_userId_fkey";
ALTER TABLE "Comment" DROP CONSTRAINT IF EXISTS "Comment_userId_fkey";
ALTER TABLE "Follows" DROP CONSTRAINT IF EXISTS "Follows_followerId_fkey";
ALTER TABLE "Follows" DROP CONSTRAINT IF EXISTS "Follows_followingId_fkey";
ALTER TABLE "Like" DROP CONSTRAINT IF EXISTS "Like_userId_fkey";
ALTER TABLE "LikeComment" DROP CONSTRAINT IF EXISTS "LikeComment_userId_fkey";
ALTER TABLE "BroadcastPost" DROP CONSTRAINT IF EXISTS "BroadcastPost_userId_fkey";
ALTER TABLE "BroadcastComment" DROP CONSTRAINT IF EXISTS "BroadcastComment_userId_fkey";
ALTER TABLE "PostMention" DROP CONSTRAINT IF EXISTS "PostMention_mentionedUserId_fkey";
ALTER TABLE "PostMention" DROP CONSTRAINT IF EXISTS "PostMention_authorUserId_fkey";
ALTER TABLE "CommentMention" DROP CONSTRAINT IF EXISTS "CommentMention_mentionedUserId_fkey";
ALTER TABLE "CommentMention" DROP CONSTRAINT IF EXISTS "CommentMention_authorUserId_fkey";
ALTER TABLE "MentionNotification" DROP CONSTRAINT IF EXISTS "MentionNotification_recipientUserId_fkey";
ALTER TABLE "MentionNotification" DROP CONSTRAINT IF EXISTS "MentionNotification_actorUserId_fkey";
ALTER TABLE "FollowNotification" DROP CONSTRAINT IF EXISTS "FollowNotification_recipientUserId_fkey";
ALTER TABLE "FollowNotification" DROP CONSTRAINT IF EXISTS "FollowNotification_actorUserId_fkey";

ALTER TABLE "Post" ALTER COLUMN "userId" TYPE TEXT USING "userId"::text;
ALTER TABLE "Comment" ALTER COLUMN "userId" TYPE TEXT USING "userId"::text;
ALTER TABLE "Follows" ALTER COLUMN "followerId" TYPE TEXT USING "followerId"::text;
ALTER TABLE "Follows" ALTER COLUMN "followingId" TYPE TEXT USING "followingId"::text;
ALTER TABLE "Like" ALTER COLUMN "userId" TYPE TEXT USING "userId"::text;
ALTER TABLE "LikeComment" ALTER COLUMN "userId" TYPE TEXT USING "userId"::text;
ALTER TABLE "BroadcastPost" ALTER COLUMN "userId" TYPE TEXT USING "userId"::text;
ALTER TABLE "BroadcastComment" ALTER COLUMN "userId" TYPE TEXT USING "userId"::text;
ALTER TABLE "PostMention" ALTER COLUMN "mentionedUserId" TYPE TEXT USING "mentionedUserId"::text;
ALTER TABLE "PostMention" ALTER COLUMN "authorUserId" TYPE TEXT USING "authorUserId"::text;
ALTER TABLE "CommentMention" ALTER COLUMN "mentionedUserId" TYPE TEXT USING "mentionedUserId"::text;
ALTER TABLE "CommentMention" ALTER COLUMN "authorUserId" TYPE TEXT USING "authorUserId"::text;
ALTER TABLE "MentionNotification" ALTER COLUMN "recipientUserId" TYPE TEXT USING "recipientUserId"::text;
ALTER TABLE "MentionNotification" ALTER COLUMN "actorUserId" TYPE TEXT USING "actorUserId"::text;
ALTER TABLE "FollowNotification" ALTER COLUMN "recipientUserId" TYPE TEXT USING "recipientUserId"::text;
ALTER TABLE "FollowNotification" ALTER COLUMN "actorUserId" TYPE TEXT USING "actorUserId"::text;

ALTER TABLE "User"
  ALTER COLUMN id TYPE TEXT USING id::text,
  ALTER COLUMN id DROP DEFAULT;

ALTER TABLE "Post"
  ADD CONSTRAINT "Post_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"(id)
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE "Comment"
  ADD CONSTRAINT "Comment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "Follows"
  ADD CONSTRAINT "Follows_followerId_fkey"
  FOREIGN KEY ("followerId") REFERENCES "User"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "Follows"
  ADD CONSTRAINT "Follows_followingId_fkey"
  FOREIGN KEY ("followingId") REFERENCES "User"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "Like"
  ADD CONSTRAINT "Like_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "LikeComment"
  ADD CONSTRAINT "LikeComment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "BroadcastPost"
  ADD CONSTRAINT "BroadcastPost_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "BroadcastComment"
  ADD CONSTRAINT "BroadcastComment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "PostMention"
  ADD CONSTRAINT "PostMention_mentionedUserId_fkey"
  FOREIGN KEY ("mentionedUserId") REFERENCES "User"(id)
  ON DELETE CASCADE;

ALTER TABLE "PostMention"
  ADD CONSTRAINT "PostMention_authorUserId_fkey"
  FOREIGN KEY ("authorUserId") REFERENCES "User"(id)
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

