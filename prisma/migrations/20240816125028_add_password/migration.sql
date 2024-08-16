/*
  Warnings:

  - You are about to drop the column `passworrd` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "passworrd",
ADD COLUMN     "password" TEXT;
