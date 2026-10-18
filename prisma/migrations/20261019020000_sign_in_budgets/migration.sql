CREATE TABLE "SignInBudget" (
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SignInBudget_pkey" PRIMARY KEY ("key")
);
