-- Skill submissions to the verified skills library (#skill-submissions).
-- Contributors submit skills (test runners, linters, security guardrails);
-- a super admin reviews and approves or rejects each one.
-- An approved submission is published to the skills directory.
--
-- Additive only: a new table and enum, plus reservation of the 'skills' top-level route.

-- Rename any project that uses the reserved slug 'skills' (#project-slug)
DO $$
DECLARE
  project RECORD;
  candidate TEXT;
  attempt INT;
BEGIN
  FOR project IN
    SELECT "id", "organisationId", "slug"
    FROM "Project"
    WHERE "slug" IN ('skills')
    ORDER BY "createdAt", "id"
  LOOP
    candidate := project."slug" || '-project';
    attempt := 2;
    WHILE EXISTS (
      SELECT 1 FROM "Project" WHERE "organisationId" = project."organisationId" AND "slug" = candidate
    ) LOOP
      candidate := project."slug" || '-project-' || attempt;
      attempt := attempt + 1;
    END LOOP;
    UPDATE "Project" SET "slug" = candidate, "updatedAt" = NOW() WHERE "id" = project."id";
  END LOOP;
END $$;

-- CreateEnum
CREATE TYPE "SkillSubmissionStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "SkillSubmission" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "categoryLabel" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "tags" TEXT[],
    "prompt" TEXT NOT NULL,
    "checklist" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sampleCommand" TEXT,
    "documentationUrl" TEXT,
    "status" "SkillSubmissionStatus" NOT NULL DEFAULT 'pending',
    "submittedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SkillSubmission_slug_key" ON "SkillSubmission"("slug");

-- CreateIndex
CREATE INDEX "SkillSubmission_status_idx" ON "SkillSubmission"("status");

-- CreateIndex
CREATE INDEX "SkillSubmission_submittedById_idx" ON "SkillSubmission"("submittedById");

-- CreateIndex
CREATE INDEX "SkillSubmission_createdAt_idx" ON "SkillSubmission"("createdAt");

-- AddForeignKey
ALTER TABLE "SkillSubmission" ADD CONSTRAINT "SkillSubmission_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillSubmission" ADD CONSTRAINT "SkillSubmission_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
