/*
  Warnings:

  - The `upvotes` column on the `Opportunity` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `views` column on the `Opportunity` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Opportunity" DROP COLUMN "upvotes",
ADD COLUMN     "upvotes" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "views",
ADD COLUMN     "views" INTEGER NOT NULL DEFAULT 0;
