/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the `BroadcastPost` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LikePost` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "BroadcastPost" DROP CONSTRAINT "BroadcastPost_postId_fkey";

-- DropForeignKey
ALTER TABLE "BroadcastPost" DROP CONSTRAINT "BroadcastPost_userId_fkey";

-- DropForeignKey
ALTER TABLE "LikePost" DROP CONSTRAINT "LikePost_postId_fkey";

-- DropForeignKey
ALTER TABLE "LikePost" DROP CONSTRAINT "LikePost_userId_fkey";

-- AlterTable
ALTER TABLE "Post" DROP COLUMN "createdAt",
ADD COLUMN     "timeStamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "BroadcastPost";

-- DropTable
DROP TABLE "LikePost";

-- CreateTable
CREATE TABLE "Like" (
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,

    CONSTRAINT "Like_pkey" PRIMARY KEY ("userId","postId")
);

-- CreateTable
CREATE TABLE "Broadcast" (
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,

    CONSTRAINT "Broadcast_pkey" PRIMARY KEY ("userId","postId")
);

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Broadcast" ADD CONSTRAINT "Broadcast_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Broadcast" ADD CONSTRAINT "Broadcast_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
