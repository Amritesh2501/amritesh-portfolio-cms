-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'EDITOR');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProjectLifecycle" AS ENUM ('LIVE', 'IN_DEVELOPMENT', 'ARCHIVED', 'PRIVATE', 'COMING_SOON');

-- CreateEnum
CREATE TYPE "NavLocation" AS ENUM ('HEADER', 'FOOTER', 'BOTH');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ADMIN',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "shortHeadline" TEXT,
    "bio" TEXT NOT NULL,
    "longBio" TEXT,
    "location" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "profileImage" TEXT,
    "resumeUrl" TEXT,
    "availabilityStatus" TEXT,
    "availabilityText" TEXT,
    "currentlyWorkingAt" TEXT,
    "currentlyWorkingRole" TEXT,
    "yearsOfExperience" INTEGER,
    "heroTagline" TEXT,
    "heroDescription" TEXT,
    "philosophy" TEXT,
    "technicalInterests" TEXT,
    "currentFocus" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "publishedAt" TIMESTAMP(3),
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_links" (
    "platform" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "icon" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "id" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "publishedAt" TIMESTAMP(3),
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "publishedAt" TIMESTAMP(3),
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "fullDescription" TEXT,
    "thumbnail" TEXT,
    "heroImage" TEXT,
    "year" INTEGER,
    "lifecycle" "ProjectLifecycle" NOT NULL DEFAULT 'LIVE',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "liveUrl" TEXT,
    "githubUrl" TEXT,
    "caseStudyUrl" TEXT,
    "role" TEXT,
    "duration" TEXT,
    "challenges" TEXT,
    "solution" TEXT,
    "results" TEXT,
    "architecture" TEXT,
    "lessonsLearned" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "categoryId" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_technologies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "project_technologies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_metrics" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "project_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_images" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "caption" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "project_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiences" (
    "id" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "location" TEXT,
    "employmentType" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "currentlyWorking" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "achievements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "companyLogo" TEXT,
    "companyUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experience_technologies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "experienceId" TEXT NOT NULL,

    CONSTRAINT "experience_technologies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "education" (
    "id" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "degree" TEXT NOT NULL,
    "field" TEXT,
    "location" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "grade" TEXT,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "publishedAt" TIMESTAMP(3),
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skill_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "proficiency" INTEGER,
    "yearsExperience" DOUBLE PRECISION,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "categoryId" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "publishedAt" TIMESTAMP(3),
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certifications" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "credentialId" TEXT,
    "credentialUrl" TEXT,
    "certificateImage" TEXT,
    "description" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "group" TEXT NOT NULL DEFAULT 'site',
    "label" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'text',
    "options" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "navigation_items" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "icon" TEXT,
    "location" "NavLocation" NOT NULL DEFAULT 'HEADER',
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "external" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "navigation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "alt" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limits" (
    "id" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "social_links_displayOrder_idx" ON "social_links"("displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "project_categories_name_key" ON "project_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "project_categories_slug_key" ON "project_categories"("slug");

-- CreateIndex
CREATE INDEX "project_categories_displayOrder_idx" ON "project_categories"("displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "projects_slug_key" ON "projects"("slug");

-- CreateIndex
CREATE INDEX "projects_status_displayOrder_idx" ON "projects"("status", "displayOrder");

-- CreateIndex
CREATE INDEX "projects_categoryId_idx" ON "projects"("categoryId");

-- CreateIndex
CREATE INDEX "project_technologies_projectId_displayOrder_idx" ON "project_technologies"("projectId", "displayOrder");

-- CreateIndex
CREATE INDEX "project_metrics_projectId_displayOrder_idx" ON "project_metrics"("projectId", "displayOrder");

-- CreateIndex
CREATE INDEX "project_images_projectId_displayOrder_idx" ON "project_images"("projectId", "displayOrder");

-- CreateIndex
CREATE INDEX "experiences_status_displayOrder_idx" ON "experiences"("status", "displayOrder");

-- CreateIndex
CREATE INDEX "experience_technologies_experienceId_displayOrder_idx" ON "experience_technologies"("experienceId", "displayOrder");

-- CreateIndex
CREATE INDEX "education_status_displayOrder_idx" ON "education"("status", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "skill_categories_name_key" ON "skill_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "skill_categories_slug_key" ON "skill_categories"("slug");

-- CreateIndex
CREATE INDEX "skill_categories_displayOrder_idx" ON "skill_categories"("displayOrder");

-- CreateIndex
CREATE INDEX "skills_status_displayOrder_idx" ON "skills"("status", "displayOrder");

-- CreateIndex
CREATE INDEX "skills_categoryId_idx" ON "skills"("categoryId");

-- CreateIndex
CREATE INDEX "certifications_status_displayOrder_idx" ON "certifications"("status", "displayOrder");

-- CreateIndex
CREATE INDEX "achievements_status_displayOrder_idx" ON "achievements"("status", "displayOrder");

-- CreateIndex
CREATE INDEX "site_settings_group_displayOrder_idx" ON "site_settings"("group", "displayOrder");

-- CreateIndex
CREATE INDEX "navigation_items_location_displayOrder_idx" ON "navigation_items"("location", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "media_key_key" ON "media"("key");

-- CreateIndex
CREATE INDEX "media_createdAt_idx" ON "media"("createdAt");

-- CreateIndex
CREATE INDEX "contact_messages_read_createdAt_idx" ON "contact_messages"("read", "createdAt");

-- CreateIndex
CREATE INDEX "rate_limits_expiresAt_idx" ON "rate_limits"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "rate_limits_bucket_key" ON "rate_limits"("bucket");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "project_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_technologies" ADD CONSTRAINT "project_technologies_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_metrics" ADD CONSTRAINT "project_metrics_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_images" ADD CONSTRAINT "project_images_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_technologies" ADD CONSTRAINT "experience_technologies_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "skill_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
