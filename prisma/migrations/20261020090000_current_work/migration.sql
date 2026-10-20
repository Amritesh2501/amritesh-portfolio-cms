-- "Currently working on": in-progress work with its images and milestones.

-- CreateTable
CREATE TABLE "current_work" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tagline" TEXT,
    "summary" TEXT NOT NULL,
    "cover" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'BUILDING',
    "health" TEXT NOT NULL DEFAULT 'ON_TRACK',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "targetDate" TIMESTAMP(3),
    "latestUpdate" TEXT,
    "nextUp" TEXT,
    "repoUrl" TEXT,
    "previewUrl" TEXT,
    "technologies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "current_work_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "current_work_images" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "workId" TEXT NOT NULL,

    CONSTRAINT "current_work_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "current_work_milestones" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "dueDate" TIMESTAMP(3),
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "workId" TEXT NOT NULL,

    CONSTRAINT "current_work_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "current_work_status_displayOrder_idx" ON "current_work"("status", "displayOrder");

-- CreateIndex
CREATE INDEX "current_work_images_workId_displayOrder_idx" ON "current_work_images"("workId", "displayOrder");

-- CreateIndex
CREATE INDEX "current_work_milestones_workId_displayOrder_idx" ON "current_work_milestones"("workId", "displayOrder");

-- AddForeignKey
ALTER TABLE "current_work_images" ADD CONSTRAINT "current_work_images_workId_fkey" FOREIGN KEY ("workId") REFERENCES "current_work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "current_work_milestones" ADD CONSTRAINT "current_work_milestones_workId_fkey" FOREIGN KEY ("workId") REFERENCES "current_work"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- The dev log is gone; the GitHub username setting only drives the calendar now.
UPDATE "site_settings" SET "description" = 'Drives the contribution calendar. Empty uses the GitHub link from Social links.' WHERE "key" = 'site.githubUser';
