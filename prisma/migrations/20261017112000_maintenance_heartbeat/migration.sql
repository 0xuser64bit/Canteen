CREATE TABLE "Maintenance" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "succeededAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3)
);
