-- migrate:up

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "likesVisibility" "BirthdayVisibility" NOT NULL DEFAULT 'PUBLIC',
  ADD COLUMN IF NOT EXISTS "bookmarksVisibility" "BirthdayVisibility" NOT NULL DEFAULT 'PRIVATE';

-- migrate:down

ALTER TABLE "User"
  DROP COLUMN IF EXISTS "bookmarksVisibility",
  DROP COLUMN IF EXISTS "likesVisibility";

