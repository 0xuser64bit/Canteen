/*
  Warnings:

  - You are about to drop the column `likesCount` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `viewsCount` on the `Post` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Post" DROP COLUMN "likesCount",
DROP COLUMN "viewsCount",
ADD COLUMN     "shares" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "views" INTEGER NOT NULL DEFAULT 0;
