/*
  Warnings:

  - The primary key for the `Like` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[id]` on the table `Like` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Like" DROP CONSTRAINT "Like_pkey",
ADD COLUMN     "id" TEXT NOT NULL DEFAULT 'uinui';

-- CreateIndex
CREATE UNIQUE INDEX "Like_id_key" ON "Like"("id");
