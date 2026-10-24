ALTER TYPE "NotificationType" ADD VALUE 'REPLY';

ALTER TABLE "Comment" ADD COLUMN "replyToId" TEXT;
CREATE INDEX "Comment_replyToId_idx" ON "Comment"("replyToId");
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
