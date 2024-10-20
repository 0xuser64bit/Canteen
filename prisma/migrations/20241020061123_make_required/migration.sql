/*
  Warnings:

  - Made the column `validUniversityId` on table `domain` required. This step will fail if there are existing NULL values in that column.
  - Made the column `validUniversityId` on table `webPage` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "domain" DROP CONSTRAINT "domain_validUniversityId_fkey";

-- DropForeignKey
ALTER TABLE "webPage" DROP CONSTRAINT "webPage_validUniversityId_fkey";

-- AlterTable
ALTER TABLE "domain" ALTER COLUMN "validUniversityId" SET NOT NULL;

-- AlterTable
ALTER TABLE "webPage" ALTER COLUMN "validUniversityId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "domain" ADD CONSTRAINT "domain_validUniversityId_fkey" FOREIGN KEY ("validUniversityId") REFERENCES "ValidUniversity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webPage" ADD CONSTRAINT "webPage_validUniversityId_fkey" FOREIGN KEY ("validUniversityId") REFERENCES "ValidUniversity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
