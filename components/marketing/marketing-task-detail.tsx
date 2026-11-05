import type { ReactNode } from "react";
import { marketingPath } from "@/lib/project-paths";
import { formatIssueNumber } from "@/lib/issue-number";
import { BackToList } from "@/components/back-to-list";
import { MarketingTaskHeader } from "./marketing-task-header";
import { MarketingDeliverablesPanel, type MarketingDeliveryView } from "./marketing-deliverables-panel";
import { MarketingReviewsPanel, type MarketingReviewView } from "./marketing-reviews-panel";
import { IssueTimeline, TimelineStep } from "@/components/issue-timeline";
import { AwardBox } from "@/components/award-box";
import type { IssueHold } from "@/lib/issue-holders";
import type { Status, Substatus } from "@prisma/client";

export type MarketingTaskDetailProps = {
  bug: {
    id: string;
    number: number;
    title: string;
    description: string;
    status: Status;
    substatus: Substatus;
    reward?: number | null;
    revisionCount: number;
    createdAt: Date | string;
    type?: { id: string; name: string } | null;
    reporter?: { name: string | null; email?: string | null } | null;
    createdByAgent?: { id: string; name: string } | null;
    project: { slug: string; name?: string; goal?: string | null; siteUrl?: string | null };
    idea?: { id: string; number: number; rationale?: string | null } | null;
  };
  revisionLimit: number;
  hold: IssueHold | null;
  deliveries: MarketingDeliveryView[];
  reviews: MarketingReviewView[];
  bidsSlot?: ReactNode;
  awardSlot?: ReactNode;
  nextStepSlot?: ReactNode;
  bannerSlot?: ReactNode;
  commentsSlot?: ReactNode;
  actionsMenuSlot?: ReactNode;
  sideRailSlot?: ReactNode;
  canReply: boolean;
};

export function MarketingTaskDetail({
  bug,
  revisionLimit,
  hold,
  deliveries,
  reviews,
  bidsSlot,
  awardSlot,
  nextStepSlot,
  bannerSlot,
  commentsSlot,
  actionsMenuSlot,
  sideRailSlot,
  canReply,
}: MarketingTaskDetailProps) {
  const isInProgress = bug.status === "in_progress";
  const workerName = hold?.agentName ? `${hold.agentName} (for ${hold.personName})` : null;

  return (
    <div className="issue-detail-scope flex flex-col gap-6 pb-12" data-testid="marketing-task-detail">
      {/* Top Navigation & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zk-divider pb-3">
        <div className="flex items-center gap-2">
          <BackToList
            fallback={marketingPath(bug.project.slug, "tasks")}
            label="Back to marketing tasks"
          />
          <span className="text-xs text-zk-muted">/</span>
          <span className="font-mono text-xs font-bold text-zk-muted">
            {formatIssueNumber(bug.number)}
          </span>
        </div>

        {actionsMenuSlot ? (
          <div className="flex items-center gap-2 print:hidden">
            {actionsMenuSlot}
          </div>
        ) : null}
      </div>

      {/* Main Grid: Left Primary Content (65%), Right Sidebar (35%) */}
      <div className="flex flex-wrap items-start gap-6">
        {/* Main Column */}
        <div className="flex min-w-0 flex-[999_1_640px] flex-col gap-6">
          {/* Status Alert Banners & Next Step Bar */}
          {bannerSlot}
          {nextStepSlot}

          {/* Marketing Context Header (Focus, Rationale, Rewards, Type) */}
          <MarketingTaskHeader
            number={bug.number}
            title={bug.title}
            description={bug.description}
            status={bug.status}
            substatus={bug.substatus}
            taskType={bug.type}
            reward={bug.reward}
            revisionCount={bug.revisionCount}
            maxRevisions={revisionLimit}
            projectSlug={bug.project.slug}
            projectName={bug.project.name}
            projectFocus={bug.project.goal}
            projectSiteUrl={bug.project.siteUrl}
            rationale={bug.idea?.rationale}
            reporter={bug.reporter}
            reporterAgent={bug.createdByAgent}
            createdAt={bug.createdAt}
          />

          {/* Active Claim / Award Box (when claimed & in progress) */}
          {hold?.status === "active" && isInProgress ? (
            <AwardBox hold={hold} />
          ) : null}

          {/* Marketing Task Pipeline (Deliverables, Reviews, Bids) */}
          <section
            id="conversation"
            aria-label="Marketing task pipeline"
            className="scroll-mt-24 rounded-[20px] border border-zk-border bg-zk-surface p-5 sm:p-6"
          >
            <IssueTimeline>
              {/* 1. Reviews / Verdicts Step (Approve vs Changes Requested) */}
              <TimelineStep>
                <MarketingReviewsPanel
                  bugId={bug.id}
                  reviews={reviews}
                  revisionCount={bug.revisionCount}
                  maxRevisions={revisionLimit}
                  canReply={canReply}
                />
              </TimelineStep>

              {/* 2. Deliverables Step (Links, Files, Copy Preview) */}
              <TimelineStep>
                <MarketingDeliverablesPanel
                  bugId={bug.id}
                  deliveries={deliveries}
                  isInProgress={isInProgress}
                  workerName={workerName}
                  canReply={canReply}
                />
              </TimelineStep>

              {/* 3. Bids & Award Step (Open Task Bidding) */}
              {bidsSlot ? (
                <TimelineStep>{bidsSlot}</TimelineStep>
              ) : null}

              {/* 4. Initial Award Info if not active */}
              {awardSlot && !(hold?.status === "active" && isInProgress) ? (
                <TimelineStep>{awardSlot}</TimelineStep>
              ) : null}
            </IssueTimeline>
          </section>

          {/* Comments Discussion Thread */}
          {commentsSlot}
        </div>

        {/* Side Rail Column */}
        {sideRailSlot ? (
          <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-5">
            {sideRailSlot}
          </aside>
        ) : null}
      </div>
    </div>
  );
}
