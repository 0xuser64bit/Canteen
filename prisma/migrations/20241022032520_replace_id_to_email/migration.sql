-- DropForeignKey
ALTER TABLE "Opportunity" DROP CONSTRAINT "Opportunity_userId_fkey";

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("email") ON DELETE RESTRICT ON UPDATE CASCADE;
