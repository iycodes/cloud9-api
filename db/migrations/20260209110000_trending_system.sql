-- migrate:up

CREATE TABLE IF NOT EXISTS "TrendSignal" (
  id TEXT PRIMARY KEY,
  "entityType" TEXT NOT NULL CHECK ("entityType" IN ('hashtag', 'user', 'text')),
  "entityKey" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL CHECK ("sourceType" IN ('post', 'comment')),
  "sourceId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "signalKind" TEXT NOT NULL CHECK (
    "signalKind" IN ('hashtag', 'mention', 'author', 'text')
  ),
  weight DOUBLE PRECISION NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE ("entityType", "entityKey", "sourceType", "sourceId", "signalKind")
);

CREATE TABLE IF NOT EXISTS "TrendMinuteBucket" (
  "bucketMinute" TIMESTAMP NOT NULL,
  "entityType" TEXT NOT NULL CHECK ("entityType" IN ('hashtag', 'user', 'text')),
  "entityKey" TEXT NOT NULL,
  "signalWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "eventCount" INT NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("bucketMinute", "entityType", "entityKey")
);

CREATE TABLE IF NOT EXISTS "TrendSnapshot" (
  id TEXT PRIMARY KEY,
  "timeWindow" TEXT NOT NULL CHECK ("timeWindow" IN ('15m', '1h', '24h')),
  "entityType" TEXT NOT NULL CHECK ("entityType" IN ('hashtag', 'user', 'text')),
  rank INT NOT NULL,
  "entityKey" TEXT NOT NULL,
  score DOUBLE PRECISION NOT NULL,
  "count15m" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "count1h" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "count24h" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "events15m" INT NOT NULL DEFAULT 0,
  "events1h" INT NOT NULL DEFAULT 0,
  "events24h" INT NOT NULL DEFAULT 0,
  "uniqueUsers24h" INT NOT NULL DEFAULT 0,
  "computedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE ("timeWindow", "entityType", rank)
);

CREATE TABLE IF NOT EXISTS "TrendJobState" (
  id TEXT PRIMARY KEY,
  "lastProcessedAt" TIMESTAMP NOT NULL,
  "lastSuccessfulAt" TIMESTAMP,
  "lastCleanupAt" TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "TrendSignal_createdAt_idx"
  ON "TrendSignal" ("createdAt" DESC);

CREATE INDEX IF NOT EXISTS "TrendSignal_entity_createdAt_idx"
  ON "TrendSignal" ("entityType", "entityKey", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "TrendSignal_entity_actor_createdAt_idx"
  ON "TrendSignal" ("entityType", "entityKey", "actorUserId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "TrendMinuteBucket_entity_bucket_idx"
  ON "TrendMinuteBucket" ("entityType", "entityKey", "bucketMinute" DESC);

CREATE INDEX IF NOT EXISTS "TrendSnapshot_window_entity_rank_idx"
  ON "TrendSnapshot" ("timeWindow", "entityType", rank);

CREATE INDEX IF NOT EXISTS "TrendSnapshot_entity_score_idx"
  ON "TrendSnapshot" ("entityType", "timeWindow", score DESC);

-- migrate:down

DROP INDEX IF EXISTS "TrendSnapshot_entity_score_idx";
DROP INDEX IF EXISTS "TrendSnapshot_window_entity_rank_idx";
DROP INDEX IF EXISTS "TrendMinuteBucket_entity_bucket_idx";
DROP INDEX IF EXISTS "TrendSignal_entity_actor_createdAt_idx";
DROP INDEX IF EXISTS "TrendSignal_entity_createdAt_idx";
DROP INDEX IF EXISTS "TrendSignal_createdAt_idx";

DROP TABLE IF EXISTS "TrendJobState";
DROP TABLE IF EXISTS "TrendSnapshot";
DROP TABLE IF EXISTS "TrendMinuteBucket";
DROP TABLE IF EXISTS "TrendSignal";
