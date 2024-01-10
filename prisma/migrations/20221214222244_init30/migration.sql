/*
  Warnings:

  - You are about to drop the `BroadcastComment` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `commentId` to the `BroadcastPost` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "BroadcastComment" DROP CONSTRAINT "BroadcastComment_commentId_fkey";

-- DropForeignKey
ALTER TABLE "BroadcastComment" DROP CONSTRAINT "BroadcastComment_userId_fkey";

-- AlterTable
ALTER TABLE "BroadcastPost" ADD COLUMN     "commentId" TEXT NOT NULL;

-- DropTable
DROP TABLE "BroadcastComment";

-- AddForeignKey
ALTER TABLE "BroadcastPost" ADD CONSTRAINT "BroadcastPost_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
