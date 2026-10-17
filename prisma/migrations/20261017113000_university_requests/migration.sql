CREATE TABLE "UniversityRequest" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "domain" TEXT NOT NULL,
  "website" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "accepted" BOOLEAN
);
CREATE UNIQUE INDEX "UniversityRequest_domain_key" ON "UniversityRequest"("domain");
CREATE INDEX "UniversityRequest_reviewedAt_createdAt_idx" ON "UniversityRequest"("reviewedAt", "createdAt");
