-- Plan review (#plan-review), step 2 of 2: an issue's difficulty, the plan as
-- the Plan review step's entry, its revisions, replies under a plan, the
-- project's plan review window, and the claim index that counts a planning
-- claim as holding its issue.

ALTER TABLE "Bug" ADD COLUMN "difficulty" "Difficulty" NOT NULL DEFAULT 'medium';

ALTER TABLE "ProjectWorkflow" ADD COLUMN "planReviewSeconds" INTEGER NOT NULL DEFAULT 7200;

CREATE TABLE "Plan" (
  "id" TEXT NOT NULL,
  "bugId" TEXT NOT NULL,
  "claimId" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "reading" TEXT NOT NULL,
  "assumptions" TEXT NOT NULL,
  "uncertainties" TEXT NOT NULL,
  "steps" JSONB NOT NULL,
  "estimateMinutes" INTEGER NOT NULL,
  "risk" "PlanScale" NOT NULL,
  "confidence" "PlanScale" NOT NULL,
  "round" INTEGER NOT NULL DEFAULT 1,
  "submittedAt" TIMESTAMP(3) NOT NULL,
  "decision" "PlanDecision",
  "decidedAt" TIMESTAMP(3),
  "decisionNote" TEXT,
  "reviewBy" TIMESTAMP(3) NOT NULL,
  "pointsPaidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Plan_claimId_key" ON "Plan"("claimId");
CREATE INDEX "Plan_bugId_createdAt_idx" ON "Plan"("bugId", "createdAt");

ALTER TABLE "Plan" ADD CONSTRAINT "Plan_bugId_fkey" FOREIGN KEY ("bugId") REFERENCES "Bug"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "IssueClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PlanRevision" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "round" INTEGER NOT NULL,
  "kind" TEXT NOT NULL,
  "steps" JSONB NOT NULL,
  "reading" TEXT NOT NULL,
  "assumptions" TEXT NOT NULL,
  "uncertainties" TEXT NOT NULL,
  "estimateMinutes" INTEGER NOT NULL,
  "risk" "PlanScale" NOT NULL,
  "confidence" "PlanScale" NOT NULL,
  "note" TEXT,
  "byUserId" TEXT NOT NULL,
  "byAgentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PlanRevision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlanRevision_planId_createdAt_idx" ON "PlanRevision"("planId", "createdAt");

ALTER TABLE "PlanRevision" ADD CONSTRAINT "PlanRevision_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Comment" ADD COLUMN "planId" TEXT;
CREATE INDEX "Comment_planId_idx" ON "Comment"("planId");
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One planning claim per issue, like one pending offer and one active claim.
CREATE UNIQUE INDEX "IssueClaim_one_planning_claim_per_bug_key"
ON "IssueClaim"("bugId")
WHERE "status" = 'planning' AND "releasedAt" IS NULL;
