-- migrate:up

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BirthdayDisplayMode') THEN
    CREATE TYPE "BirthdayDisplayMode" AS ENUM (
      'DAY',
      'MONTH_DAY',
      'YEAR'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BirthdayVisibility') THEN
    CREATE TYPE "BirthdayVisibility" AS ENUM (
      'PUBLIC',
      'FOLLOWERS',
      'FOLLOWING',
      'MUTUALS',
      'PRIVATE'
    );
  END IF;
END $$;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "birthdayDate" DATE,
  ADD COLUMN IF NOT EXISTS "birthdayDisplayMode" "BirthdayDisplayMode" NOT NULL DEFAULT 'MONTH_DAY',
  ADD COLUMN IF NOT EXISTS "birthdayVisibility" "BirthdayVisibility" NOT NULL DEFAULT 'PRIVATE';

UPDATE "User"
SET "birthdayDate" = birthday::date
WHERE "birthdayDate" IS NULL
  AND birthday IS NOT NULL
  AND BTRIM(birthday) <> ''
  AND birthday ~ '^\d{4}-\d{2}-\d{2}$';

-- migrate:down

ALTER TABLE "User"
  DROP COLUMN IF EXISTS "birthdayVisibility",
  DROP COLUMN IF EXISTS "birthdayDisplayMode",
  DROP COLUMN IF EXISTS "birthdayDate";

DROP TYPE IF EXISTS "BirthdayVisibility";
DROP TYPE IF EXISTS "BirthdayDisplayMode";
