/*
  Warnings:

  - You are about to drop the column `opportunityCommentId` on the `Upvote` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Upvote" DROP CONSTRAINT "Upvote_opportunityCommentId_fkey";

-- DropIndex
DROP INDEX "Upvote_userId_opportunityCommentId_key";

-- AlterTable
ALTER TABLE "Upvote" DROP COLUMN "opportunityCommentId";
