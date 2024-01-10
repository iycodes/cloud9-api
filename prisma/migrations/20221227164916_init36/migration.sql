/*
  Warnings:

  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "name",
ADD COLUMN     "firstname" TEXT NOT NULL DEFAULT 'lol',
ADD COLUMN     "lastname" TEXT NOT NULL DEFAULT 'lol';
