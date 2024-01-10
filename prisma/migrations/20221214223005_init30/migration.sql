-- AlterTable
ALTER TABLE "BroadcastPost" ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "title" TEXT NOT NULL DEFAULT 'COMMENT';

-- AlterTable
ALTER TABLE "Post" ALTER COLUMN "title" SET DEFAULT 'POST';
