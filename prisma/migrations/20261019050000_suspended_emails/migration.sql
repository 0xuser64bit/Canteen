CREATE TABLE "SuspendedEmail" (
  "hash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SuspendedEmail_pkey" PRIMARY KEY ("hash")
);
