/*
  Warnings:

  - A unique constraint covering the columns `[userId,opportunityId]` on the table `Upvote` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "OpportunityComment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "OpportunityComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OpportunityComment_userId_opportunityId_key" ON "OpportunityComment"("userId", "opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "Upvote_userId_opportunityId_key" ON "Upvote"("userId", "opportunityId");

-- AddForeignKey
ALTER TABLE "OpportunityComment" ADD CONSTRAINT "OpportunityComment_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityComment" ADD CONSTRAINT "OpportunityComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("email") ON DELETE CASCADE ON UPDATE CASCADE;
