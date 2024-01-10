/*
  Warnings:

  - The primary key for the `Like` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `id` to the `Like` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Like" DROP CONSTRAINT "Like_pkey",
ADD COLUMN     "id" TEXT NOT NULL,
ADD CONSTRAINT "Like_pkey" PRIMARY KEY ("id");
