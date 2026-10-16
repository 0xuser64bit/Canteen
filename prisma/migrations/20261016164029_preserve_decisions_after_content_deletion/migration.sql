-- DropForeignKey
ALTER TABLE "ModerationCase" DROP CONSTRAINT "ModerationCase_commentId_fkey";

-- DropForeignKey
ALTER TABLE "ModerationCase" DROP CONSTRAINT "ModerationCase_postId_fkey";

-- AddForeignKey
ALTER TABLE "ModerationCase" ADD CONSTRAINT "ModerationCase_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationCase" ADD CONSTRAINT "ModerationCase_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
