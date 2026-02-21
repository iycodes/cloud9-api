-- migrate:up

DO $$
BEGIN
  IF to_regclass('public."User"') IS NOT NULL
     AND to_regclass('public.users') IS NULL THEN
    ALTER TABLE "User" RENAME TO users;
  END IF;
END $$;

-- migrate:down

DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL
     AND to_regclass('public."User"') IS NULL THEN
    ALTER TABLE users RENAME TO "User";
  END IF;
END $$;
