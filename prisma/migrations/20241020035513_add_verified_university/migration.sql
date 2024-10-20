-- CreateTable
CREATE TABLE "ValidUniversity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domains" TEXT NOT NULL,
    "web_pages" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "alpha_two_code" TEXT NOT NULL,
    "state_province" TEXT,

    CONSTRAINT "ValidUniversity_pkey" PRIMARY KEY ("id")
);
