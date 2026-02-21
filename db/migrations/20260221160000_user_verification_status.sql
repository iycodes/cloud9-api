-- migrate:up

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "verificationStatus" TEXT;

UPDATE users
SET "verificationStatus" = 'premium'
WHERE "verificationStatus" IS NULL
   OR TRIM("verificationStatus") = '';

ALTER TABLE users
  ALTER COLUMN "verificationStatus" SET DEFAULT 'basic',
  ALTER COLUMN "verificationStatus" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_verification_status_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_verification_status_check
      CHECK ("verificationStatus" IN ('none', 'basic', 'standard', 'premium'));
  END IF;
END $$;

-- migrate:down

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_verification_status_check;

ALTER TABLE users
  DROP COLUMN IF EXISTS "verificationStatus";
