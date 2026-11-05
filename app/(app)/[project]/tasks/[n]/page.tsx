import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireProject } from "@/lib/project-route";
import { prisma } from "@/lib/prisma";
import { formatZ } from "@/lib/points/rules";
import { EARN_PROJECT_SLUG, EARN_TASKS, ZIKI_TASKS_PATH, stageAfterPaying, tasksPaid, zikiTaskPath } from "@/lib/earn/draft";
import { sampleStage, startedTask } from "@/lib/earn/state";
import { EarnTaskWork } from "@/components/earn-task-work";
import { agentsLink, agentsPrimaryBtn, agentsSurface } from "@/app/(app)/settings/agents/agents-ui";

export const metadata = { title: "Ziki task" };

type State = "locked" | "open" | "in-progress" | "in-review" | "paid";
const STEPS = [
  { key: "open", label: "Open" },
  { key: "in-progress", label: "In progress" },
  { key: "in-review", label: "In review" },
  { key: "paid", label: "Paid" },
] as const;
const STATUS_PILL: Record<State, { label: string; className: string }> = {
  locked: { label: "Not open yet", className: "bg-zk-chip text-zk-muted" },
  open: { label: "Open", className: "bg-zk-chip text-zk-text2" },
  "in-progress": { label: "In progress", className: "bg-zk-tint text-zk-accent" },
  "in-review": { label: "In review", className: "bg-zk-warn-bg text-zk-warn-fg" },
  paid: { label: "Paid", className: "bg-zk-ok-bg text-zk-ok-fg" },
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

/**
 * A Ziki task's own page (#earn-drafts, Mark's review), laid out like an
 * issue page. Its own four steps (Open → In progress → In review → Paid):
 * no bids, pull requests or merge. The reporter is always Ziki; you become
 * the assignee when you start.
 */
export default async function ZikiTaskPage({
  params,
  searchParams,
}: {
  params: Promise<{ project: string; n: string }>;
  searchParams: Promise<{ step?: string; p?: string }>;
}) {
  const { project: slug, n: raw } = await params;
  const n = Number(raw);
  if (slug !== EARN_PROJECT_SLUG || !Number.isInteger(n) || n < 1 || n > EARN_TASKS.length) notFound();
  const { user } = await requireProject(slug, zikiTaskPath(n));
  const query = await searchParams;
  const stage = await sampleStage();
  const started = await startedTask();
  const paid = tasksPaid(stage);
  const index = n - 1;
  const task = EARN_TASKS[index];

  // Draft: the step of the task being done comes from the address (?step=), since nothing is saved yet.
  // Draft: opening the task that is next, already started, remembers it (so the list says In progress too).
  if (index === paid && (query.step === "in-progress" || query.step === "in-review") && started !== n) redirect(`/earn/start-task?n=${n}${query.step === "in-review" ? "&to=in-review" : ""}`);
  const state: State =
    index < paid ? "paid" : index > paid ? "locked" : query.step === "in-progress" || query.step === "in-review" ? query.step : started === n ? "in-progress" : "open";
  const stepIndex = state === "locked" ? 0 : STEPS.findIndex((step) => step.key === state);
  const assigned = state !== "open" && state !== "locked";
  const person = Number(query.p ?? 0) || 0;
  const here = zikiTaskPath(n);
  // The connected agent: it is the assignee on every task, and does the research and emails.
  const agent = await prisma.agent.findFirst({ where: { ownerUserId: user.id, revokedAt: null }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, avatar: true } }).catch(() => null);
  const next = EARN_TASKS[index + 1];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={ZIKI_TASKS_PATH} aria-label="Back to Ziki tasks" className="inline-flex h-10 w-10 items-center justify-center rounded-full text-zk-accent hover:bg-zk-chip focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-blue">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
        </Link>
        <h1 className="min-w-0 flex-1 text-3xl font-extrabold tracking-tight text-zk-text">
          <span className="font-bold tabular-nums text-zk-muted">#{n}</span> {task.title}
        </h1>
        <span className="inline-flex items-center rounded-full bg-zk-ok-bg px-3 py-1 text-sm font-bold text-zk-ok-fg">Ziki task</span>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-5">
          <section aria-labelledby="task-summary" className={`${agentsSurface} p-5 sm:p-6`}>
            <h2 id="task-summary" className="text-xs font-bold uppercase tracking-[0.06em] text-zk-muted">Summary</h2>
            <p className="mt-2 text-[15px] text-zk-text">{task.detail}</p>
          </section>

          <section aria-labelledby="task-progress" className={`${agentsSurface} p-5 sm:p-6`}>
            <h2 id="task-progress" className="text-xs font-bold uppercase tracking-[0.06em] text-zk-muted">Progress report</h2>
            <ol className="m-0 mt-5 grid list-none grid-cols-4 p-0">
              {STEPS.map((step, i) => {
                const reached = state !== "locked" && i < stepIndex;
                const current = state !== "locked" && i === stepIndex;
                return (
                  <li key={step.key} className="relative flex flex-col items-center text-center">
                    {i > 0 ? <span aria-hidden="true" className={`absolute right-1/2 top-4 h-0.5 w-full ${i <= stepIndex && state !== "locked" ? "bg-zk-ok-fg" : "bg-zk-border"}`} /> : null}
                    <span
                      aria-hidden="true"
                      className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                        reached || (current && state === "paid") ? "bg-zk-ok-bg text-zk-ok-fg" : current ? "bg-electric-blue-strong text-white ring-4 ring-electric-blue-strong/20" : "border border-zk-border bg-zk-surface text-zk-muted"
                      }`}
                    >
                      {reached || (current && state === "paid") ? "✓" : i + 1}
                    </span>
                    <span className={`mt-2 text-sm ${current || reached ? "font-semibold text-zk-text" : "text-zk-muted"}`}>{step.label}</span>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* What happens now, and who does it. */}
          <section aria-labelledby="task-next" className="flex gap-4 rounded-[20px] border-2 border-electric-blue/40 bg-zk-tint p-5">
            <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-electric-blue-strong text-white">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              {state === "locked" ? (
                <>
                  <h2 id="task-next" className="text-base font-bold text-zk-text">Opens after task {n - 1}</h2>
                  <p className="text-sm text-zk-text2">Ziki tasks go one at a time; each builds on the one before.</p>
                  <Link href={zikiTaskPath(n - 1)} className={`text-sm ${agentsLink}`}>Go to task {n - 1}: {EARN_TASKS[n - 2].title} →</Link>
                </>
              ) : state === "open" ? (
                <>
                  <h2 id="task-next" className="text-base font-bold text-zk-text">Open</h2>
                  <p className="text-sm text-zk-text2">{task.detail}</p>
                  <p className="text-sm text-zk-text2"><b className="text-zk-text">You:</b> start it. You become its assignee.</p>
                  <Link href={`/earn/start-task?n=${n}`} prefetch={false} className={`${agentsPrimaryBtn} mt-2`}>Start task</Link>
                </>
              ) : state === "in-progress" ? (
                <>
                  <h2 id="task-next" className="text-base font-bold text-zk-text">In progress</h2>
                  <p className="text-sm text-zk-text2">{task.detail}</p>
                  <p className="text-sm text-zk-text2"><b className="text-zk-text">You:</b> do the work below, then send it for checking.</p>
                </>
              ) : state === "in-review" ? (
                <>
                  <h2 id="task-next" className="text-base font-bold text-zk-text">In review</h2>
                  <p className="text-sm text-zk-text2">Ziki checks every task before it pays. You&apos;ll see it here when it&apos;s paid.</p>
                  {/* Draft only: stands in for Ziki checking it. */}
                  <Link href={`/earn/preview?state=${stageAfterPaying(stage)}&next=${encodeURIComponent(here)}`} prefetch={false} className={`text-xs ${agentsLink}`}>Draft: mark it checked and paid</Link>
                </>
              ) : (
                <>
                  <h2 id="task-next" className="text-base font-bold text-zk-text">Paid</h2>
                  <p className="text-sm text-zk-text2">+{formatZ(task.pay)} was added to your balance.</p>
                  {next ? <Link href={zikiTaskPath(n + 1)} className={`${agentsPrimaryBtn} mt-2`}>Next: {next.title}</Link> : <Link href="/earn/people" className={`text-sm ${agentsLink}`}>All four done. See who you reached →</Link>}
                </>
              )}
            </div>
          </section>

          {assigned ? (
            <section aria-labelledby="task-work" className={`${agentsSurface} space-y-4 p-5 sm:p-6`}>
              <h2 id="task-work" className="text-xs font-bold uppercase tracking-[0.06em] text-zk-muted">Your work</h2>
              <EarnTaskWork
                id={task.id}
                agent={agent}
                person={person}
                done={state !== "in-progress"}
                tabHref={(i) => `${here}?step=${state === "paid" ? "" : state}&p=${i}`}
              />
              {state === "in-progress" ? (
                <div className="flex justify-end border-t border-zk-divider pt-4">
                  <Link href={`${here}?step=in-review`} className={agentsPrimaryBtn}>Send for checking</Link>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>

        <div className="space-y-5">
          <section aria-labelledby="task-status" className={`${agentsSurface} p-5`}>
            <h2 id="task-status" className="text-xs font-bold uppercase tracking-[0.06em] text-zk-muted">Status</h2>
            <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${STATUS_PILL[state].className}`}>
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
              {STATUS_PILL[state].label}
            </span>
          </section>
          <section aria-labelledby="task-pays" className={`${agentsSurface} p-5`}>
            <h2 id="task-pays" className="text-xs font-bold uppercase tracking-[0.06em] text-zk-muted">Pays</h2>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
              <span className="text-3xl font-extrabold tabular-nums text-zk-text">${task.pay}</span>
              <span className="text-sm text-zk-muted">{state === "paid" ? "paid to you" : "paid to you once Ziki checks it"}</span>
            </p>
          </section>
          <section aria-labelledby="task-people" className={`${agentsSurface} p-5`}>
            <h2 id="task-people" className="text-xs font-bold uppercase tracking-[0.06em] text-zk-muted">People</h2>
            <dl className="m-0 mt-3 grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-y-3 text-sm">
              <dt className="text-zk-muted">Reporter</dt>
              <dd className="m-0 flex items-center gap-2 font-semibold text-zk-text">
                <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-zk-text text-xs font-extrabold text-white">Z</span>
                Ziki
              </dd>
              <dt className="text-zk-muted">Assignee</dt>
              <dd className="m-0 flex items-center gap-2 font-semibold text-zk-text">
                {assigned ? (
                  <>
                    {/* The task is done by the earner's agent, so it is the assignee, not the person. */}
                    <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-zk-ok-fg text-xs font-bold text-white">{initials(agent?.name ?? "Agent")}</span>
                    {agent?.name ?? "Unassigned"}
                  </>
                ) : (
                  <span className="font-normal text-zk-muted">Unassigned</span>
                )}
              </dd>
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
