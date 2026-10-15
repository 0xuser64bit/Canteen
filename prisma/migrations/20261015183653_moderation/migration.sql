-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "resolvedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bannedAt" TIMESTAMP(3);
