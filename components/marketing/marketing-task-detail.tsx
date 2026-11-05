"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { marketingPath } from "@/lib/project-paths";
import { formatIssueNumber } from "@/lib/issue-number";
import { MarketingTaskHeader } from "./marketing-task-header";
import { MarketingDeliverablesPanel, type MarketingDeliveryView } from "./marketing-deliverables-panel";
import { MarketingReviewsPanel, type MarketingReviewView } from "./marketing-reviews-panel";
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
  bidsCount?: number;
  commentsCount?: number;
  canReply: boolean;
};

type PipelineTab = "deliverables" | "reviews" | "bids" | "discussion";

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
  bidsCount = 0,
  commentsCount = 0,
  canReply,
}: MarketingTaskDetailProps) {
  const isInProgress = bug.status === "in_progress";
  const workerName = hold?.agentName ? `${hold.agentName} (for ${hold.personName})` : null;

  const [activeTab, setActiveTab] = useState<PipelineTab>(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      const hash = window.location.hash.toLowerCase();
      if (hash === "#comments" || hash.includes("comment")) return "discussion";
      if (hash === "#reviews" || hash === "#verdicts") return "reviews";
      if (hash === "#deliverables") return "deliverables";
      if (hash === "#bids") return "bids";
    }
    if (bug.status === "open") return "bids";
    if (bug.status === "done" || bug.substatus === "requires_review") return "reviews";
    return "deliverables";
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === "#comments" || hash.includes("comment")) setActiveTab("discussion");
      else if (hash === "#reviews" || hash === "#verdicts") setActiveTab("reviews");
      else if (hash === "#deliverables") setActiveTab("deliverables");
      else if (hash === "#bids") setActiveTab("bids");
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return (
    <div className="issue-detail-scope flex flex-col gap-6 pb-12" data-testid="marketing-task-detail">
      {/* Top Breadcrumb Navigation & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zk-divider pb-3">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs">
          <Link
            href={marketingPath(bug.project.slug, "tasks")}
            className="inline-flex items-center gap-1.5 font-medium text-zk-muted transition-colors hover:text-zk-text"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>Marketing Tasks</span>
          </Link>
          <span className="text-zk-muted/50" aria-hidden="true">/</span>
          <span className="font-mono font-bold text-zk-text">
            {formatIssueNumber(bug.number)}
          </span>
        </nav>

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

          {/* Marketing Context Header (Focus, Rationale, Rewards, Type, Description) */}
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

          {/* Tabbed Pipeline: Deliverables, Reviews, Bids, Discussion */}
          <div className="flex flex-col gap-3">
            <div className="flex overflow-x-auto pb-1">
              <div
                role="tablist"
                aria-label="Marketing task sections"
                className="flex items-center gap-1 rounded-full bg-zk-seg p-1 text-xs"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "deliverables"}
                  aria-controls="panel-deliverables"
                  id="tab-deliverables"
                  onClick={() => setActiveTab("deliverables")}
                  className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-semibold transition-all ${
                    activeTab === "deliverables"
                      ? "bg-zk-surface text-zk-text shadow-sm"
                      : "text-zk-muted hover:text-zk-text"
                  }`}
                >
                  <span>Deliverables</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 font-mono text-[11px] ${
                      activeTab === "deliverables"
                        ? "bg-teal-500/15 font-bold text-teal-700 dark:text-teal-300"
                        : "bg-zk-chip text-zk-muted"
                    }`}
                  >
                    {deliveries.length}
                  </span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "reviews"}
                  aria-controls="panel-reviews"
                  id="tab-reviews"
                  onClick={() => setActiveTab("reviews")}
                  className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-semibold transition-all ${
                    activeTab === "reviews"
                      ? "bg-zk-surface text-zk-text shadow-sm"
                      : "text-zk-muted hover:text-zk-text"
                  }`}
                >
                  <span>Peer Reviews</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 font-mono text-[11px] ${
                      activeTab === "reviews"
                        ? "bg-teal-500/15 font-bold text-teal-700 dark:text-teal-300"
                        : "bg-zk-chip text-zk-muted"
                    }`}
                  >
                    {reviews.length}
                  </span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "bids"}
                  aria-controls="panel-bids"
                  id="tab-bids"
                  onClick={() => setActiveTab("bids")}
                  className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-semibold transition-all ${
                    activeTab === "bids"
                      ? "bg-zk-surface text-zk-text shadow-sm"
                      : "text-zk-muted hover:text-zk-text"
                  }`}
                >
                  <span>Bids & Award</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 font-mono text-[11px] ${
                      activeTab === "bids"
                        ? "bg-teal-500/15 font-bold text-teal-700 dark:text-teal-300"
                        : "bg-zk-chip text-zk-muted"
                    }`}
                  >
                    {bidsCount}
                  </span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "discussion"}
                  aria-controls="panel-discussion"
                  id="tab-discussion"
                  onClick={() => setActiveTab("discussion")}
                  className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-semibold transition-all ${
                    activeTab === "discussion"
                      ? "bg-zk-surface text-zk-text shadow-sm"
                      : "text-zk-muted hover:text-zk-text"
                  }`}
                >
                  <span>Discussion</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 font-mono text-[11px] ${
                      activeTab === "discussion"
                        ? "bg-teal-500/15 font-bold text-teal-700 dark:text-teal-300"
                        : "bg-zk-chip text-zk-muted"
                    }`}
                  >
                    {commentsCount}
                  </span>
                </button>
              </div>
            </div>

            {/* Panels Container */}
            <div className="rounded-[20px] border border-zk-border bg-zk-surface p-5 sm:p-6">
              {/* Deliverables Panel */}
              <div
                role="tabpanel"
                id="panel-deliverables"
                aria-labelledby="tab-deliverables"
                hidden={activeTab !== "deliverables"}
              >
                <MarketingDeliverablesPanel
                  bugId={bug.id}
                  deliveries={deliveries}
                  isInProgress={isInProgress}
                  workerName={workerName}
                  canReply={canReply}
                />
              </div>

              {/* Peer Reviews Panel */}
              <div
                role="tabpanel"
                id="panel-reviews"
                aria-labelledby="tab-reviews"
                hidden={activeTab !== "reviews"}
              >
                <MarketingReviewsPanel
                  bugId={bug.id}
                  reviews={reviews}
                  revisionCount={bug.revisionCount}
                  maxRevisions={revisionLimit}
                  canReply={canReply}
                />
              </div>

              {/* Bids Panel */}
              <div
                role="tabpanel"
                id="panel-bids"
                aria-labelledby="tab-bids"
                hidden={activeTab !== "bids"}
                className="flex flex-col gap-4"
              >
                {awardSlot ? (
                  <div className="rounded-xl border border-zk-ok-fg/20 bg-zk-ok-bg/20 p-4">
                    <div className="mb-2 text-xs font-bold uppercase tracking-wider text-zk-ok-fg">
                      Award Decision
                    </div>
                    {awardSlot}
                  </div>
                ) : null}
                {bidsSlot ? (
                  bidsSlot
                ) : (
                  <div className="rounded-xl border border-dashed border-zk-divider bg-zk-surface/50 p-6 text-center text-sm text-zk-muted">
                    No bids submitted yet for this task.
                  </div>
                )}
              </div>

              {/* Discussion Panel */}
              <div
                role="tabpanel"
                id="panel-discussion"
                aria-labelledby="tab-discussion"
                hidden={activeTab !== "discussion"}
              >
                {commentsSlot ? (
                  commentsSlot
                ) : (
                  <div className="rounded-xl border border-dashed border-zk-divider bg-zk-surface/50 p-6 text-center text-sm text-zk-muted">
                    No comments yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Side Rail */}
        {sideRailSlot ? (
          <aside className="flex min-w-[280px] flex-[1_1_320px] flex-col gap-4">
            {sideRailSlot}
          </aside>
        ) : null}
      </div>
    </div>
  );
}
