/*
  Warnings:

  - You are about to drop the column `domains` on the `ValidUniversity` table. All the data in the column will be lost.
  - You are about to drop the column `web_pages` on the `ValidUniversity` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ValidUniversity" DROP COLUMN "domains",
DROP COLUMN "web_pages";

-- CreateTable
CREATE TABLE "domain" (
    "id" TEXT NOT NULL,
    "domainName" TEXT NOT NULL,
    "validUniversityId" TEXT,

    CONSTRAINT "domain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webPage" (
    "id" TEXT NOT NULL,
    "webPageName" TEXT NOT NULL,
    "validUniversityId" TEXT,

    CONSTRAINT "webPage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "domain" ADD CONSTRAINT "domain_validUniversityId_fkey" FOREIGN KEY ("validUniversityId") REFERENCES "ValidUniversity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webPage" ADD CONSTRAINT "webPage_validUniversityId_fkey" FOREIGN KEY ("validUniversityId") REFERENCES "ValidUniversity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
