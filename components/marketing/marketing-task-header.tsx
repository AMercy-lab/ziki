import Link from "next/link";
import { formatZ } from "@/lib/points/rules";
import { LocalTime } from "@/components/local-time";
import { statusLabels } from "@/lib/labels";
import { marketingPath } from "@/lib/project-paths";
import type { Status, Substatus } from "@prisma/client";

export type MarketingTaskHeaderProps = {
  number: number;
  title: string;
  description: string;
  status: Status;
  substatus: Substatus;
  taskType?: { id: string; name: string } | null;
  reward?: number | null;
  revisionCount: number;
  maxRevisions: number;
  projectSlug: string;
  projectName?: string;
  projectFocus?: string | null;
  projectSiteUrl?: string | null;
  rationale?: string | null;
  reporter?: { name: string | null; email?: string | null } | null;
  reporterAgent?: { name: string } | null;
  createdAt: Date | string;
};

export function MarketingTaskHeader({
  number,
  title,
  description,
  status,
  substatus,
  taskType,
  reward,
  revisionCount,
  maxRevisions,
  projectSlug,
  projectName,
  projectFocus,
  projectSiteUrl,
  rationale,
  reporter,
  reporterAgent,
  createdAt,
}: MarketingTaskHeaderProps) {
  const isLive = status === "resolved" || substatus === "published";
  const isInProgress = status === "in_progress";
  const isInReview = status === "done" || substatus === "requires_review";
  const showTaskType = taskType && taskType.name.trim().toLowerCase() !== "marketing";

  return (
    <div className="flex flex-col gap-4">
      {/* Top Meta Bar: Number, Marketing Track Badge, Task Type, Status, Reward */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-bold text-zk-muted">#{number}</span>
          <Link
            href={marketingPath(projectSlug)}
            className="inline-flex items-center rounded-full border border-teal-500/30 bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-100 dark:bg-teal-950/40 dark:text-teal-300 dark:hover:bg-teal-900/40"
          >
            Marketing
          </Link>
          {showTaskType ? (
            <span className="inline-flex items-center rounded-full border border-zk-divider bg-zk-surface px-2.5 py-0.5 text-xs font-medium text-zk-text2">
              {taskType.name}
            </span>
          ) : null}
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              isLive
                ? "border border-zk-ok-fg/30 bg-zk-ok-bg text-zk-ok-fg"
                : isInProgress
                  ? "border border-zk-info-fg/30 bg-zk-info-bg text-zk-info-fg"
                  : isInReview
                    ? "border border-zk-accent/30 bg-zk-chip text-zk-accent"
                    : "border border-zk-divider bg-zk-chip text-zk-text2"
            }`}
          >
            {isLive ? "Live (Published)" : statusLabels[status] ?? status}
          </span>
          {maxRevisions > 0 && (isInProgress || isInReview || revisionCount > 0) ? (
            <span
              className="inline-flex items-center rounded-full border border-zk-warn-fg/30 bg-zk-warn-bg px-2.5 py-0.5 text-xs font-bold text-zk-warn-fg"
              title={`Marketing work revision limit: ${maxRevisions} rounds before reopening`}
            >
              Revision {revisionCount} of {maxRevisions}
            </span>
          ) : null}
        </div>

        {reward !== undefined && reward !== null && reward > 0 ? (
          <div className="flex items-center gap-1.5 rounded-full border border-zk-ok-fg/30 bg-zk-ok-bg px-3 py-1 text-sm font-bold text-zk-ok-fg">
            <span className="text-xs uppercase tracking-wider text-zk-muted">Reward</span>
            <span className="font-mono text-base">{formatZ(reward)}</span>
          </div>
        ) : null}
      </div>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zk-text sm:text-3xl">
          {title}
        </h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-zk-muted">
          <span>
            Proposed by{" "}
            <b className="font-semibold text-zk-text">
              {reporterAgent?.name ?? reporter?.name ?? "Contributor"}
            </b>
            {reporterAgent && reporter?.name ? ` for ${reporter.name}` : ""}
          </span>
          <span>·</span>
          <LocalTime date={createdAt} />
        </p>
      </div>

      {/* Campaign Focus Banner (if project has an active focus) */}
      {projectFocus ? (
        <div className="flex items-start gap-3 rounded-xl border border-zk-info-fg/30 bg-zk-info-bg/40 p-3.5 text-sm text-zk-text">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zk-info-fg text-white">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="m12 8 4 4-4 4M8 12h8" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zk-info-fg">
                {projectName ? `${projectName} Focus` : "Current Campaign Focus"}
              </span>
              {projectSiteUrl ? (
                <a
                  href={projectSiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-zk-accent hover:underline"
                >
                  Visit Site ↗
                </a>
              ) : null}
            </div>
            <p className="mt-0.5 text-sm font-medium text-zk-text">{projectFocus}</p>
          </div>
        </div>
      ) : null}

      {/* Unified Description & Strategic Rationale Card */}
      {description || rationale ? (
        <section aria-label="Task description" className="rounded-[20px] border border-zk-border bg-zk-surface p-5 text-sm text-zk-text">
          {description ? (
            <div>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-zk-muted">
                Task Description
              </h2>
              <div className="prose prose-sm max-w-none text-zk-text dark:prose-invert whitespace-pre-wrap leading-relaxed">
                {description}
              </div>
            </div>
          ) : null}

          {rationale ? (
            <div className={description ? "mt-4 border-t border-zk-divider pt-4" : ""}>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.08em] text-zk-muted">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-zk-muted" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                <span>Strategic Rationale</span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-zk-text2 whitespace-pre-line">
                {rationale}
              </p>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
