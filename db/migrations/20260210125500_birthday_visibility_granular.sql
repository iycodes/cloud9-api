-- migrate:up

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "birthdayMonthDayVisibility" "BirthdayVisibility" NOT NULL DEFAULT 'PRIVATE',
  ADD COLUMN IF NOT EXISTS "birthdayDayVisibility" "BirthdayVisibility" NOT NULL DEFAULT 'PRIVATE',
  ADD COLUMN IF NOT EXISTS "birthdayYearVisibility" "BirthdayVisibility" NOT NULL DEFAULT 'PRIVATE';

UPDATE "User"
SET
  "birthdayMonthDayVisibility" = COALESCE("birthdayMonthDayVisibility", "birthdayVisibility", 'PRIVATE'),
  "birthdayDayVisibility" = COALESCE("birthdayDayVisibility", "birthdayVisibility", 'PRIVATE'),
  "birthdayYearVisibility" = COALESCE("birthdayYearVisibility", "birthdayVisibility", 'PRIVATE');

-- migrate:down

ALTER TABLE "User"
  DROP COLUMN IF EXISTS "birthdayYearVisibility",
  DROP COLUMN IF EXISTS "birthdayDayVisibility",
  DROP COLUMN IF EXISTS "birthdayMonthDayVisibility";
