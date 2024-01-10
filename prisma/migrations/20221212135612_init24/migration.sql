/*
  Warnings:

  - You are about to drop the `Broadcast` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Broadcast" DROP CONSTRAINT "Broadcast_postId_fkey";

-- DropForeignKey
ALTER TABLE "Broadcast" DROP CONSTRAINT "Broadcast_userId_fkey";

-- DropTable
DROP TABLE "Broadcast";

-- CreateTable
CREATE TABLE "BroadcastPost" (
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,

    CONSTRAINT "BroadcastPost_pkey" PRIMARY KEY ("userId","postId")
);

-- AddForeignKey
ALTER TABLE "BroadcastPost" ADD CONSTRAINT "BroadcastPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BroadcastPost" ADD CONSTRAINT "BroadcastPost_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
