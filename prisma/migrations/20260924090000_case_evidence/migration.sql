-- The evidence board in the case room.
--
-- `linksTo` is a plain text array of other pins' codes rather than a join
-- table: a thread that names a pin which no longer exists is drawn as no
-- thread at all, which is what the board should do, and is also why there is
-- no foreign key here to block a delete.
CREATE TABLE "case_evidence" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'PHOTO',
    "linksTo" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_evidence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "case_evidence_code_key" ON "case_evidence"("code");

CREATE INDEX "case_evidence_status_displayOrder_idx" ON "case_evidence"("status", "displayOrder");
