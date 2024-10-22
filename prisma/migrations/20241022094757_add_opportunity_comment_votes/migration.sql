/*
  Warnings:

  - A unique constraint covering the columns `[userId,opportunityCommentId]` on the table `Upvote` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Upvote" ADD COLUMN     "opportunityCommentId" TEXT,
ALTER COLUMN "opportunityId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Upvote_userId_opportunityCommentId_key" ON "Upvote"("userId", "opportunityCommentId");

-- AddForeignKey
ALTER TABLE "Upvote" ADD CONSTRAINT "Upvote_opportunityCommentId_fkey" FOREIGN KEY ("opportunityCommentId") REFERENCES "OpportunityComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
