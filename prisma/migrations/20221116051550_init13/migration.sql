/*
  Warnings:

  - You are about to drop the column `id` on the `Like` table. All the data in the column will be lost.
  - Added the required column `userName` to the `Post` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Broadcast" DROP CONSTRAINT "Broadcast_postId_fkey";

-- DropForeignKey
ALTER TABLE "Broadcast" DROP CONSTRAINT "Broadcast_userId_fkey";

-- DropIndex
DROP INDEX "Like_id_key";

-- AlterTable
ALTER TABLE "Like" DROP COLUMN "id",
ADD CONSTRAINT "Like_pkey" PRIMARY KEY ("userId", "postId");

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "userName" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Broadcast" ADD CONSTRAINT "Broadcast_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Broadcast" ADD CONSTRAINT "Broadcast_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
