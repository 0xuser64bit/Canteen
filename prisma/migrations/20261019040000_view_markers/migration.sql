-- A view counts once per student without recording who read what. The app now
-- writes `viewer` as a keyed hash of account and post. Existing rows get random
-- markers: counts stay, and no reading history remains.
ALTER TABLE "PostView" DROP CONSTRAINT "PostView_userId_fkey";
ALTER TABLE "PostView" DROP CONSTRAINT "PostView_pkey";
DROP INDEX "PostView_postId_idx";
ALTER TABLE "PostView" DROP COLUMN "createdAt";
ALTER TABLE "PostView" RENAME COLUMN "userId" TO "viewer";
UPDATE "PostView" SET "viewer" = gen_random_uuid()::text;
ALTER TABLE "PostView" ADD CONSTRAINT "PostView_pkey" PRIMARY KEY ("postId", "viewer");
