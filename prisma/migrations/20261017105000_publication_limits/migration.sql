CREATE TYPE "PublicationKind" AS ENUM ('POST', 'COMMENT', 'UPLOAD');
CREATE TABLE "Publication" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kind" "PublicationKind" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Publication_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Publication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Publication_userId_kind_createdAt_idx" ON "Publication"("userId", "kind", "createdAt");
CREATE INDEX "Publication_createdAt_idx" ON "Publication"("createdAt");
INSERT INTO "Publication" ("id", "userId", "kind", "createdAt")
SELECT 'post:' || "id", "authorId", 'POST'::"PublicationKind", "createdAt" FROM "Post" WHERE "createdAt" > CURRENT_TIMESTAMP - INTERVAL '15 minutes';
INSERT INTO "Publication" ("id", "userId", "kind", "createdAt")
SELECT 'comment:' || "id", "authorId", 'COMMENT'::"PublicationKind", "createdAt" FROM "Comment" WHERE "createdAt" > CURRENT_TIMESTAMP - INTERVAL '10 minutes';
