/*
  Warnings:

  - You are about to drop the column `commentId` on the `BroadcastPost` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `BroadcastPost` table. All the data in the column will be lost.
  - The primary key for the `LikeComment` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `id` to the `LikeComment` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "BroadcastPost" DROP CONSTRAINT "BroadcastPost_commentId_fkey";

-- AlterTable
ALTER TABLE "BroadcastPost" DROP COLUMN "commentId",
DROP COLUMN "title";

-- AlterTable
ALTER TABLE "LikeComment" DROP CONSTRAINT "LikeComment_pkey",
ADD COLUMN     "id" TEXT NOT NULL,
ADD CONSTRAINT "LikeComment_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "BroadcastComment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,

    CONSTRAINT "BroadcastComment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BroadcastComment" ADD CONSTRAINT "BroadcastComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BroadcastComment" ADD CONSTRAINT "BroadcastComment_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
