/*
  Warnings:

  - You are about to drop the column `firstname` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `broadcastComment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `broadcastPost` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `likeComment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `likePost` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[email]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phone]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Made the column `userId` on table `Post` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_userId_fkey";

-- DropForeignKey
ALTER TABLE "broadcastComment" DROP CONSTRAINT "broadcastComment_commentId_fkey";

-- DropForeignKey
ALTER TABLE "broadcastComment" DROP CONSTRAINT "broadcastComment_userId_fkey";

-- DropForeignKey
ALTER TABLE "broadcastPost" DROP CONSTRAINT "broadcastPost_postId_fkey";

-- DropForeignKey
ALTER TABLE "broadcastPost" DROP CONSTRAINT "broadcastPost_userId_fkey";

-- DropForeignKey
ALTER TABLE "likeComment" DROP CONSTRAINT "likeComment_commentId_fkey";

-- DropForeignKey
ALTER TABLE "likeComment" DROP CONSTRAINT "likeComment_userId_fkey";

-- DropForeignKey
ALTER TABLE "likePost" DROP CONSTRAINT "likePost_postId_fkey";

-- DropForeignKey
ALTER TABLE "likePost" DROP CONSTRAINT "likePost_userId_fkey";

-- AlterTable
ALTER TABLE "Post" ALTER COLUMN "userId" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "firstname",
ADD COLUMN     "coverImageSrc" TEXT,
ADD COLUMN     "email" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "name" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "profileImageSrc" TEXT,
ADD COLUMN     "website" TEXT;

-- DropTable
DROP TABLE "broadcastComment";

-- DropTable
DROP TABLE "broadcastPost";

-- DropTable
DROP TABLE "likeComment";

-- DropTable
DROP TABLE "likePost";

-- CreateTable
CREATE TABLE "LikePost" (
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,

    CONSTRAINT "LikePost_pkey" PRIMARY KEY ("userId","postId")
);

-- CreateTable
CREATE TABLE "LikeComment" (
    "userId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,

    CONSTRAINT "LikeComment_pkey" PRIMARY KEY ("userId","commentId")
);

-- CreateTable
CREATE TABLE "BroadcastPost" (
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,

    CONSTRAINT "BroadcastPost_pkey" PRIMARY KEY ("userId","postId")
);

-- CreateTable
CREATE TABLE "BroadcastComment" (
    "userId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,

    CONSTRAINT "BroadcastComment_pkey" PRIMARY KEY ("userId","commentId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LikePost" ADD CONSTRAINT "LikePost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LikePost" ADD CONSTRAINT "LikePost_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LikeComment" ADD CONSTRAINT "LikeComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LikeComment" ADD CONSTRAINT "LikeComment_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BroadcastPost" ADD CONSTRAINT "BroadcastPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BroadcastPost" ADD CONSTRAINT "BroadcastPost_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BroadcastComment" ADD CONSTRAINT "BroadcastComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BroadcastComment" ADD CONSTRAINT "BroadcastComment_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
