-- AlterTable
ALTER TABLE "User" ALTER COLUMN "email" DROP DEFAULT,
ALTER COLUMN "name" DROP DEFAULT,
ALTER COLUMN "username" DROP NOT NULL,
ALTER COLUMN "username" DROP DEFAULT;
