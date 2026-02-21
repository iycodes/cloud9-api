-- migrate:up

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "createdAt" timestamp without time zone NOT NULL DEFAULT NOW();

-- migrate:down

ALTER TABLE "User"
  DROP COLUMN IF EXISTS "createdAt";

