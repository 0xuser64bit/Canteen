-- CreateEnum
CREATE TYPE "PostKind" AS ENUM ('DISCUSSION', 'QUESTION');

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "kind" "PostKind" NOT NULL DEFAULT 'DISCUSSION';

-- CreateTable
CREATE TABLE "HelpfulAnswer" (
    "postId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HelpfulAnswer_pkey" PRIMARY KEY ("postId")
);

-- CreateIndex
CREATE UNIQUE INDEX "HelpfulAnswer_commentId_key" ON "HelpfulAnswer"("commentId");

-- AddForeignKey
ALTER TABLE "HelpfulAnswer" ADD CONSTRAINT "HelpfulAnswer_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpfulAnswer" ADD CONSTRAINT "HelpfulAnswer_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
