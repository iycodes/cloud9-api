-- migrate:up

CREATE TABLE IF NOT EXISTS "MentionNotification" (
  id TEXT PRIMARY KEY,
  "recipientUserId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "actorUserId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "entityType" TEXT NOT NULL CHECK ("entityType" IN ('post', 'comment')),
  "entityId" TEXT NOT NULL,
  "isRead" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE ("recipientUserId", "actorUserId", "entityType", "entityId")
);

CREATE INDEX IF NOT EXISTS "MentionNotification_recipient_createdAt_idx"
ON "MentionNotification" ("recipientUserId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "MentionNotification_recipient_unread_createdAt_idx"
ON "MentionNotification" ("recipientUserId", "isRead", "createdAt" DESC);

-- migrate:down

DROP INDEX IF EXISTS "MentionNotification_recipient_unread_createdAt_idx";
DROP INDEX IF EXISTS "MentionNotification_recipient_createdAt_idx";
DROP TABLE IF EXISTS "MentionNotification";
