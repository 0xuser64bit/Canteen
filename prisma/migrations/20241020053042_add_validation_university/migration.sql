/*
  Warnings:

  - The `domains` column on the `ValidUniversity` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `web_pages` column on the `ValidUniversity` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "ValidUniversity" DROP COLUMN "domains",
ADD COLUMN     "domains" TEXT[],
DROP COLUMN "web_pages",
ADD COLUMN     "web_pages" TEXT[];
