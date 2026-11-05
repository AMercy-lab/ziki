import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { isEarner } from "@/lib/earn/earner";
import { EARN_TASKS, WITHDRAW_THRESHOLD, earnBalance, earnAgentActivity, tasksPaid, zikiTaskPath } from "@/lib/earn/draft";
import { sampleStage, startedTask } from "@/lib/earn/state";
import { formatZ } from "@/lib/points/rules";
import { agentsLink, agentsSurface } from "@/app/(app)/settings/agents/agents-ui";

export const metadata = { title: "Getting started" };

type Step = { label: string; done: boolean; href?: string; pay?: number };
type Stage = { name: string; desc: string; steps: Step[] };

/**
 * Getting started (#earn-drafts, Mark's call of 5 Nov): the roadmap for
 * someone who came to earn, laid out like the staged roadmap he likes. Steps
 * tick themselves off from what the person has actually done, so nothing is
 * marked by hand. Same sample earner as the rest of the draft.
 */
export default async function EarnRoadmapPage() {
  const user = await requireUser();
  const [earner, stage, started] = await Promise.all([isEarner(user.id), sampleStage(), startedTask()]);
  const [agent, profile] = await Promise.all([
    earner
      ? prisma.agent.findFirst({ where: { ownerUserId: user.id, revokedAt: null }, orderBy: { createdAt: "asc" }, select: { name: true } }).catch(() => null)
      : null,
    prisma.user.findUnique({ where: { id: user.id }, select: { walletAddress: true, name: true } }).catch(() => null),
  ]);
  const balance = earnBalance(stage);
  const paid = tasksPaid(stage);
  const ready = balance.withdrawable > 0;
  const firstName = (profile?.name ?? user.name ?? "").split(" ")[0] || "there";

  const stages: Stage[] = [
    {
      name: "Connect your agent",
      desc: "Give your agent the setup text so it can start work.",
      steps: [
        { label: "Copy the setup text", done: earner, href: "/earn/start" },
        { label: "Paste it into your agent", done: earner, href: "/settings/connect?from=earn" },
        { label: "Your agent says hello", done: Boolean(agent), href: "/agents/mine" },
      ],
    },
    {
      name: "Pick a project",
      desc: "There is always something for your agent to do.",
      steps: [
        { label: "Choose Marketing or Open source", done: earner && (paid > 0 || started !== null || stage !== "new"), href: "/earn" },
      ],
    },
    {
      name: "Do your first tasks",
      desc: "Your agent works through them one at a time.",
      steps: EARN_TASKS.map((task, i) => ({ label: task.title, done: i < paid, href: zikiTaskPath(i + 1), pay: task.pay })),
    },
    {
      name: "Bring someone in",
      desc: `This is what unlocks your first ${formatZ(WITHDRAW_THRESHOLD)}.`,
      steps: [{ label: "Someone you reached starts a project", done: balance.converted, href: "/earn/people", pay: 11 }],
    },
    {
      name: `Withdraw your first ${formatZ(WITHDRAW_THRESHOLD)}`,
      desc: "Add where the money should go, then take it out.",
      steps: [
        { label: "Add your payout wallet", done: Boolean(profile?.walletAddress), href: "/settings" },
        { label: `Withdraw ${formatZ(WITHDRAW_THRESHOLD)}`, done: false, href: "/earn/withdraw" },
      ],
    },
    {
      name: "Take on bigger work",
      desc: "Join a real project as your record grows.",
      steps: [
        { label: "Join a real project", done: false, href: "/tenants" },
        { label: "Get your first fix accepted", done: false },
      ],
    },
  ];

  const total = stages.reduce((sum, s) => sum + s.steps.length, 0);
  const done = stages.reduce((sum, s) => sum + s.steps.filter((step) => step.done).length, 0);
  const pct = Math.round((done / total) * 100);
  const current = stages.findIndex((s) => s.steps.some((step) => !step.done));
  const nextStep = current >= 0 ? stages[current].steps.find((step) => !step.done) : null;
  const RING = 2 * Math.PI * 52;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <nav aria-label="Breadcrumb" className="flex items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-2 text-zk-muted">
          <Link href="/earn/earnings" className={agentsLink}>Earnings</Link>
          <span aria-hidden="true">›</span>
          <span className="font-semibold text-zk-text">Getting started</span>
        </span>
        <Link href="/earn/earnings" className={agentsLink}>Back to earnings</Link>
      </nav>

      <section className={`${agentsSurface} flex flex-wrap items-center justify-between gap-6 p-6 sm:p-8`}>
        <div className="min-w-0 flex-1 basis-80 space-y-3">
          <h1 className="text-balance text-3xl font-extrabold leading-tight tracking-tight text-zk-text">
            {done === total ? `You’re all set, ${firstName}.` : `Let’s get your agent earning, ${firstName}.`}
          </h1>
          <p className="max-w-lg text-sm leading-relaxed text-zk-text2">Your roadmap from connecting an agent to your first withdrawal.</p>
          <div role="group" aria-label="What brings you here" className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-sm text-zk-muted">I’m here to</span>
            <span aria-current="true" className="inline-flex min-h-11 items-center rounded-full bg-zk-text px-4 text-sm font-bold text-white">Earn with my agent</span>
            <Link href="/tenants" className="inline-flex min-h-11 items-center rounded-full border border-zk-border bg-zk-surface px-4 text-sm font-bold text-zk-text2 hover:bg-zk-chip">Build my project</Link>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="relative h-[124px] w-[124px]">
            <svg viewBox="0 0 124 124" className="h-full w-full -rotate-90" role="img" aria-label={`${pct} percent complete`}>
              <circle cx="62" cy="62" r="52" fill="none" strokeWidth="10" className="stroke-zk-seg" />
              <circle cx="62" cy="62" r="52" fill="none" strokeWidth="10" strokeLinecap="round" className="stroke-zk-ok-fg" strokeDasharray={RING} strokeDashoffset={RING * (1 - done / total)} />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-3xl font-extrabold tabular-nums text-zk-text">{pct}%</span>
          </div>
          <span className="text-sm tabular-nums text-zk-muted">{done} of {total} steps</span>
        </div>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <ol aria-label="Stages" className="m-0 flex list-none flex-col p-0">
          {stages.map((s, i) => {
            const count = s.steps.filter((step) => step.done).length;
            const status = count === s.steps.length ? "done" : i === current ? "current" : "next";
            return (
              <li key={s.name} className="grid grid-cols-[40px_minmax(0,1fr)] gap-4">
                <div className="flex flex-col items-center">
                  <span
                    aria-hidden="true"
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
                      status === "done" ? "bg-zk-ok-fg text-white" : status === "current" ? "border-[3px] border-zk-accent bg-zk-surface text-zk-accent" : "border-2 border-zk-border bg-zk-surface text-zk-muted"
                    }`}
                  >
                    {status === "done" ? "✓" : i + 1}
                  </span>
                  {i < stages.length - 1 ? <span aria-hidden="true" className={`mt-1 min-h-6 w-[3px] flex-1 rounded-full ${status === "done" ? "bg-zk-ok-fg" : "bg-zk-border"}`} /> : null}
                </div>
                <details open={status === "current"} className={`group mb-3.5 overflow-hidden ${agentsSurface}`}>
                  <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-extrabold text-zk-text">{s.name}</span>
                      <span className="block text-sm text-zk-muted">{s.desc}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${status === "done" ? "bg-zk-ok-bg text-zk-ok-fg" : status === "current" ? "bg-zk-info-bg text-zk-info-fg" : "bg-zk-chip text-zk-muted"}`}>
                        {status === "done" ? "Completed" : status === "current" ? "In progress" : "Up next"}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="h-1.5 w-20 overflow-hidden rounded-full bg-zk-seg">
                          <span className={`block h-full ${status === "done" ? "bg-zk-ok-fg" : "bg-zk-accent"}`} style={{ width: `${(count / s.steps.length) * 100}%` }} />
                        </span>
                        <span className="text-xs tabular-nums text-zk-text2">{count}/{s.steps.length}</span>
                      </span>
                    </span>
                    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-zk-muted transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                  </summary>
                  <ul className="m-0 list-none divide-y divide-zk-divider border-t border-zk-divider p-0">
                    {s.steps.map((step) => {
                      const now = !step.done && step === nextStep;
                      return (
                        <li key={step.label} className="flex items-center gap-3 px-5 py-3">
                          <span
                            aria-hidden="true"
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                              step.done ? "bg-zk-ok-fg text-white" : now ? "border-2 border-zk-accent bg-zk-tint" : "border-2 border-zk-border"
                            }`}
                          >
                            {step.done ? "✓" : ""}
                          </span>
                          <span className={`min-w-0 flex-1 text-sm ${step.done ? "text-zk-muted" : now ? "font-bold text-zk-text" : "text-zk-text2"}`}>
                            {step.href && !step.done ? <Link href={step.href} className={agentsLink}>{step.label}</Link> : step.label}
                          </span>
                          {step.pay ? (
                            <span className={`rounded-lg px-2 py-0.5 text-xs font-extrabold tabular-nums ${step.done ? "bg-zk-ok-bg text-zk-ok-fg" : "bg-zk-chip text-zk-text2"}`}>+{formatZ(step.pay)}</span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </details>
              </li>
            );
          })}
        </ol>

        <aside className="space-y-4">
          {agent ? (
            <div className={`${agentsSurface} flex items-center gap-3 p-4`}>
              <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zk-ok-fg text-white">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="8" width="16" height="11" rx="4" /><path d="M12 8V5M9.5 13h.01M14.5 13h.01M9.5 16a3.5 3.5 0 0 0 5 0" /></svg>
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-extrabold text-zk-text">{agent.name}</span>
                <span className="block text-sm text-zk-text2">{nextStep ? `Next: ${nextStep.label.toLowerCase()}.` : earnAgentActivity(stage)}</span>
              </span>
            </div>
          ) : null}

          <section aria-labelledby="balance-heading" className={`${agentsSurface} space-y-2 p-4`}>
            <h2 id="balance-heading" className="text-xs font-bold uppercase tracking-[0.06em] text-zk-muted">Your balance</h2>
            <p className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tabular-nums tracking-tight text-zk-text">${balance.earned.toFixed(2)}</span>
              <span className="text-sm text-zk-muted">{ready ? "ready to withdraw" : `of ${formatZ(WITHDRAW_THRESHOLD)}`}</span>
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-zk-seg" role="img" aria-label={`${formatZ(balance.earned)} of ${formatZ(WITHDRAW_THRESHOLD)}`}>
              <div className={`h-full rounded-full ${ready ? "bg-zk-ok-fg" : "bg-zk-accent/60"}`} style={{ width: `${Math.min(100, (balance.earned / WITHDRAW_THRESHOLD) * 100)}%` }} />
            </div>
            <Link href="/earn/earnings" className={`${agentsLink} text-sm`}>See the way to {formatZ(WITHDRAW_THRESHOLD)}</Link>
          </section>

          <section aria-labelledby="progress-heading" className={`${agentsSurface} space-y-3 p-4`}>
            <h2 id="progress-heading" className="text-xs font-bold uppercase tracking-[0.06em] text-zk-muted">Stage progress</h2>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {stages.map((s, i) => {
                const count = s.steps.filter((step) => step.done).length;
                const status = count === s.steps.length ? "done" : i === current ? "current" : "next";
                return (
                  <li key={s.name} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${status === "done" ? "bg-zk-ok-fg" : status === "current" ? "bg-zk-accent" : "border-2 border-zk-border"}`} />
                      <span className="truncate">{s.name.replace("Your ", "")}</span>
                    </span>
                    <span className="font-mono text-xs tabular-nums text-zk-muted">{Math.round((count / s.steps.length) * 100)}%</span>
                  </li>
                );
              })}
            </ul>
            <p className="rounded-xl bg-zk-ok-bg px-3 py-2.5 text-xs leading-relaxed text-zk-ok-fg">Steps tick themselves off as you use Ziki. You don’t need to mark anything done.</p>
          </section>

          {/* Draft only: see this page at the sample earner's other stages. */}
          <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zk-muted">
            Draft preview:
            <Link href="/earn/preview?state=new&next=/earn/getting-started" prefetch={false} className={agentsLink}>$5</Link>
            <Link href="/earn/preview?state=task2&next=/earn/getting-started" prefetch={false} className={agentsLink}>$10</Link>
            <Link href="/earn/preview?state=progress&next=/earn/getting-started" prefetch={false} className={agentsLink}>$19</Link>
            <Link href="/earn/preview?state=unlocked&next=/earn/getting-started" prefetch={false} className={agentsLink}>$30</Link>
          </p>
        </aside>
      </div>
    </div>
  );
}
