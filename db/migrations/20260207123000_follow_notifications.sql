-- migrate:up

CREATE TABLE IF NOT EXISTS "FollowNotification" (
  id TEXT PRIMARY KEY,
  "recipientUserId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "actorUserId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "isRead" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE ("recipientUserId", "actorUserId")
);

CREATE INDEX IF NOT EXISTS "FollowNotification_recipient_createdAt_idx"
ON "FollowNotification" ("recipientUserId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "FollowNotification_recipient_unread_createdAt_idx"
ON "FollowNotification" ("recipientUserId", "isRead", "createdAt" DESC);

-- migrate:down

DROP INDEX IF EXISTS "FollowNotification_recipient_unread_createdAt_idx";
DROP INDEX IF EXISTS "FollowNotification_recipient_createdAt_idx";
DROP TABLE IF EXISTS "FollowNotification";

