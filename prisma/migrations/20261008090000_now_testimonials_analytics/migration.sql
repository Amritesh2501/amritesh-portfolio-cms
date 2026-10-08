-- Testimonials, cookieless visitor counters, and the /now page.
--
-- The analytics tables are counters keyed by day: no IP, no cookie and no
-- visitor id is stored, so there is nothing personal in them.

-- CreateTable
CREATE TABLE "testimonials" (
    "id" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "company" TEXT,
    "avatar" TEXT,
    "url" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_stats" (
    "day" DATE NOT NULL,
    "path" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "page_stats_pkey" PRIMARY KEY ("day","path")
);

-- CreateTable
CREATE TABLE "ref_stats" (
    "day" DATE NOT NULL,
    "host" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ref_stats_pkey" PRIMARY KEY ("day","host")
);

-- CreateIndex
CREATE INDEX "testimonials_status_displayOrder_idx" ON "testimonials"("status", "displayOrder");

-- CreateIndex
CREATE INDEX "page_stats_day_idx" ON "page_stats"("day");

-- CreateIndex
CREATE INDEX "ref_stats_day_idx" ON "ref_stats"("day");


-- The /now page is two settings, editable on the Settings screen. Inserted here
-- rather than only in the seed, because the seed does not run on deploy.
INSERT INTO "site_settings" ("key", "value", "group", "label", "description", "type", "displayOrder", "updatedAt")
VALUES
  ('now.title', 'What I''m doing now', 'site', 'Now page title', 'Heading of the /now page.', 'text', 30, CURRENT_TIMESTAMP),
  ('now.body', '', 'site', 'Now page', 'Markdown. What you are focused on right now: building, learning, reading. Shown at /now; leave empty to hide the page.', 'textarea', 31, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
