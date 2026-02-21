-- migrate:up

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "verificationCodeSentAt" TIMESTAMPTZ;

-- migrate:down

ALTER TABLE "User"
  DROP COLUMN IF EXISTS "verificationCodeSentAt";
