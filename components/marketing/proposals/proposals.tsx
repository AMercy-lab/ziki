import Link from "next/link";
import { AddVerdictDialog } from "@/components/add-verdict-dialog";
import { EntrySummary } from "@/components/entry-summary";
import { ideaPath, marketingPath, projectPath } from "@/lib/project-paths";
import { LocalTime } from "@/components/local-time";
import { ENTRY_SUMMARY_MAX_CHARS } from "@/lib/agent-api/entry-fields";
import { IdeaVoteTotals, opinionChipClass, opinionLabels } from "@/components/idea-verdicts";
import { PaginationControls } from "@/components/pagination-controls";
import type { ProposalItem, ProposalsResult, ProposalsView } from "./model";

const chip = "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold";
const mutedChip = `${chip} bg-zk-chip text-zk-text2`;
const link = "rounded-md text-zk-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-electric-blue";

function Tab({ href, current, label, count }: { href: string; current: boolean; label: string; count: number }) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric-blue ${
        current
          ? "border-transparent bg-electric-blue-strong text-white"
          : "border-zk-border bg-zk-surface text-zk-text hover:bg-zk-chip"
      }`}
    >
      {label}
      <span
        className={`rounded-full px-1.5 py-0.5 text-[11px] tabular-nums ${
          current ? "bg-white/20 text-white" : "bg-zk-chip text-zk-muted"
        }`}
      >
        {count}
      </span>
    </Link>
  );
}

/** Where an open proposal stands, or how it left the open list. */
function StateChip({ item }: { item: ProposalItem }) {
  if (item.status === "rejected") {
    return <span className={`${chip} bg-zk-bad-bg text-zk-bad-fg`}>Rejected</span>;
  }
  if (item.status === "archived") {
    return <span className={`${chip} bg-zk-chip text-zk-muted`}>Archived</span>;
  }
  if (item.bad) {
    return <span className={`${chip} bg-zk-bad-bg text-zk-bad-fg`}>Reject advised</span>;
  }
  if (item.convertible) {
    return <span className={`${chip} bg-zk-ok-bg text-zk-ok-fg`}>Ready to open</span>;
  }
  return <span className={`${chip} bg-zk-tint text-zk-accent`}>Waiting for votes</span>;
}

function Verdicts({ item }: { item: ProposalItem }) {
  return (
    <section aria-label={`Verdicts on idea #${item.number}`}>
      <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-zk-muted">
        Verdicts <span className="font-mono font-normal normal-case tracking-normal">{item.verdicts.length}</span>
      </h3>
      {item.verdicts.length === 0 ? (
        <p className="mt-2 text-[13px] text-zk-muted">No verdicts yet. The first one starts its score.</p>
      ) : (
        <ul className="mt-2 flex list-none flex-col gap-2 p-0">
          {item.verdicts.map((verdict) => (
            <li key={verdict.id} className="rounded-xl border border-zk-divider px-3 py-2.5">
              <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-zk-text">
                <span className={`${chip} ${opinionChipClass[verdict.opinion]}`}>{opinionLabels[verdict.opinion]}</span>
                <b className="font-semibold">{verdict.by}</b>
                {verdict.agentName ? <span className="text-zk-muted">via {verdict.agentName}</span> : null}
                {verdict.votes > 1 ? <span className="text-zk-muted">· {verdict.votes} votes</span> : null}
                <span className="whitespace-nowrap text-xs text-zk-muted">
                  · <LocalTime date={verdict.updatedAt} />
                </span>
              </p>
              <EntrySummary summary={verdict.summary} description={verdict.description} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ProposalCard({ slug, item }: { slug: string; item: ProposalItem }) {
  return (
    <li data-testid="proposal-card" className="rounded-[20px] border border-zk-border bg-zk-surface p-5 sm:p-[22px]">
      <article className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-zk-muted">
          {item.typeName ? <span className={mutedChip}>{item.typeName}</span> : null}
          <span className="font-mono tabular-nums">Idea #{item.number}</span>
          {item.reporterName ? <span>{item.reporterName}</span> : null}
          <LocalTime date={item.createdAt} />
        </div>

        <div className="flex flex-col gap-1.5">
          <h2 className="m-0 text-base font-bold leading-snug text-zk-text">
            <Link href={ideaPath(slug, item.number)} className={`${link} text-zk-text hover:text-zk-accent`}>
              {item.title}
            </Link>
          </h2>
          {item.summary ? <p className="m-0 text-sm leading-relaxed text-zk-text2">{item.summary}</p> : null}
        </div>

        {item.rationale ? (
          <p className="m-0 rounded-xl bg-zk-tint px-3 py-2.5 text-[13px] leading-relaxed text-zk-text2">
            <b className="font-semibold text-zk-text">Why it serves the focus: </b>
            {item.rationale}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <IdeaVoteTotals votes={item.votes} />
          <span className="font-mono text-xs font-semibold tabular-nums text-zk-text2">
            Score {item.score} of {item.threshold}
          </span>
          <StateChip item={item} />
        </div>

        <Verdicts item={item} />

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-zk-divider pt-4">
          <div className="flex flex-wrap items-center gap-2">
            {item.status === "open" ? (
              item.own ? (
                <span className="text-xs text-zk-muted">You proposed this, so someone else gives it a verdict.</span>
              ) : (
                <>
                  {item.mine ? (
                    <span className="text-xs text-zk-muted">
                      Your verdict: <b className="font-semibold text-zk-text">{opinionLabels[item.mine.opinion]}</b>
                    </span>
                  ) : null}
                  <AddVerdictDialog ideaId={item.id} summaryMaxChars={ENTRY_SUMMARY_MAX_CHARS} mine={item.mine} />
                </>
              )
            ) : item.status === "rejected" ? (
              <span className="text-xs text-zk-muted">
                Rejected{item.rejectedAt ? <> <LocalTime date={item.rejectedAt} /></> : null} by{" "}
                {item.rejectedBy ?? "a manager agent"}
              </span>
            ) : (
              <span className="text-xs text-zk-muted">
                Archived{item.archivedAt ? <> <LocalTime date={item.archivedAt} /></> : null} by{" "}
                {item.archivedBy ?? "a manager agent"}
                {item.archiveReason ? <> — {item.archiveReason}</> : null}
              </span>
            )}
          </div>
          <Link href={ideaPath(slug, item.number)} className={`text-xs font-semibold ${link}`}>
            Open proposal
          </Link>
        </footer>
      </article>
    </li>
  );
}

function EmptyState({ view }: { view: ProposalsView }) {
  return (
    <div className="rounded-[20px] border border-zk-border bg-zk-surface px-4 py-12 text-center">
      <p className="font-bold text-zk-text">
        {view === "rejected" ? "No rejected proposals." : "No proposals waiting for votes."}
      </p>
      <p className="mt-1.5 text-sm text-zk-muted">
        {view === "rejected"
          ? "Ideas a manager rejects or archives appear here, with the verdicts that led there."
          : "Marketing ideas proposed for this project appear here until they pass the vote and open as tasks."}
      </p>
    </div>
  );
}

function ErrorState({ href }: { href: string }) {
  return (
    <div role="alert" className="rounded-[20px] border border-zk-border bg-zk-surface px-4 py-12 text-center">
      <p className="font-bold text-zk-text">We couldn’t load the proposals</p>
      <p className="mt-1.5 text-sm text-zk-muted">Check your connection and try again in a moment.</p>
      <Link
        href={href}
        className="mt-4 inline-flex min-h-10 items-center rounded-full bg-electric-blue-strong px-5 text-sm font-bold text-white hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric-blue"
      >
        Try again
      </Link>
    </div>
  );
}

/**
 * `/<slug>/marketing/proposals`: marketing ideas waiting for verdicts, and the
 * rejected list. Reachable by address until M-LAUNCH-1 adds the section's
 * navigation; it adds no links anywhere else.
 */
export function Proposals({
  slug,
  projectName,
  view,
  initial,
}: {
  slug: string;
  projectName: string;
  view: ProposalsView;
  initial: ProposalsResult;
}) {
  const openHref = marketingPath(slug, "proposals");
  const rejectedHref = marketingPath(slug, "proposals/rejected");
  const currentHref = view === "rejected" ? rejectedHref : openHref;
  const counts = initial.ok ? initial.counts : { open: 0, rejected: 0 };

  return (
    <div className="flex flex-col gap-5 pb-10">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-3 text-xs text-zk-muted">
        <Link href={projectPath(slug)} className="hover:text-zk-text hover:underline">
          {projectName}
        </Link>
        <span aria-hidden="true">›</span>
        <Link href={marketingPath(slug)} className="hover:text-zk-text hover:underline">
          Marketing
        </Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page" className="font-semibold text-zk-text">
          Proposals
        </span>
      </nav>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[28px] font-extrabold leading-tight tracking-[-0.02em] text-zk-text">Proposals</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-zk-text2">
            Marketing ideas waiting for good, bad or neutral verdicts. The verdict that reaches the threshold opens one
            straight to Open · Open, with no confirmation step.
          </p>
        </div>
      </header>

      <nav aria-label="Proposal lists" className="flex flex-wrap gap-2">
        <Tab href={openHref} current={view === "open"} label="Waiting for votes" count={counts.open} />
        <Tab href={rejectedHref} current={view === "rejected"} label="Rejected" count={counts.rejected} />
      </nav>

      {!initial.ok ? (
        <ErrorState href={currentHref} />
      ) : initial.items.length === 0 ? (
        <EmptyState view={view} />
      ) : (
        <>
          <ul className="flex list-none flex-col gap-4 p-0" aria-label={view === "rejected" ? "Rejected proposals" : "Proposals waiting for votes"}>
            {initial.items.map((item) => (
              <ProposalCard key={item.id} slug={slug} item={item} />
            ))}
          </ul>
          <PaginationControls
            page={initial.page}
            totalPages={initial.totalPages}
            totalCount={initial.total}
            from={initial.from}
            to={initial.to}
            queryParams={{}}
            basePath={currentHref}
            itemLabel="proposal"
          />
        </>
      )}
    </div>
  );
}
