/*
  Warnings:

  - The primary key for the `BroadcastComment` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `id` to the `BroadcastComment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BroadcastComment" DROP CONSTRAINT "BroadcastComment_pkey",
ADD COLUMN     "id" TEXT NOT NULL,
ADD CONSTRAINT "BroadcastComment_pkey" PRIMARY KEY ("id");
