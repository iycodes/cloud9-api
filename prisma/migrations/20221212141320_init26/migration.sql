/*
  Warnings:

  - The primary key for the `BroadcastPost` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `id` to the `BroadcastPost` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BroadcastPost" DROP CONSTRAINT "BroadcastPost_pkey",
ADD COLUMN     "id" TEXT NOT NULL,
ADD CONSTRAINT "BroadcastPost_pkey" PRIMARY KEY ("id");
