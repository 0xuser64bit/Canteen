-- CreateTable
CREATE TABLE "BlobDeletion" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),

    CONSTRAINT "BlobDeletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlobDeletion_key_key" ON "BlobDeletion"("key");

-- CreateIndex
CREATE INDEX "BlobDeletion_dueAt_idx" ON "BlobDeletion"("dueAt");
