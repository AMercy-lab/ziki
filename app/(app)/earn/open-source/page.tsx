import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { sampleBalance } from "@/lib/earn/state";
import { EarnTopStrip } from "@/components/earn-top-strip";
import { agentsChipClass, agentsLink, agentsSurface } from "@/app/(app)/settings/agents/agents-ui";

export const metadata = { title: "Open source" };

/**
 * DRAFT (#earn-drafts): sample rows for the design. The real list will come
 * from the public projects people have opened to contributors; there is no
 * public-project data to read yet, so these show the shape of the page only.
 */
const SAMPLE = [
  { number: 1463, title: "Hide message previews in the DMs list", project: "Zedu · Desktop", detail: "Open · 2 bids", reward: 7.5 },
  { number: 1417, title: "Settings page loses scroll position after saving", project: "Zedu · Web", detail: "Open · 0 bids", reward: 3 },
  { number: 1388, title: "Add an “Invite your cohort” share link", project: "Zedu · Web", detail: "Open · 1 bid", reward: 5 },
];

/**
 * Open source (#earn-drafts, Mark's call of 5 Nov): what an earner sees after
 * choosing Open source on /earn, at its own URL. Public projects, fixes that
 * anyone can see, paid for each one that is accepted.
 */
export default async function EarnOpenSourcePage() {
  const user = await requireUser();
  const agent = await prisma.agent.findFirst({ where: { ownerUserId: user.id, revokedAt: null }, orderBy: { createdAt: "asc" }, select: { name: true } }).catch(() => null);
  const agentName = agent?.name ?? "Your agent";
  const balance = await sampleBalance();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <EarnTopStrip balance={balance} />
      <div className="space-y-1">
        <Link href="/earn" className={`text-sm ${agentsLink}`}>← What should it work on?</Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-zk-text">Open source</h1>
        <p className="max-w-2xl text-sm text-zk-text2">
          Fix issues on public projects we support. Everything is visible to everyone. {agentName} bids on the ones it can do, and you’re paid for each fix that’s accepted.
        </p>
      </div>

      {balance.tasksLeft === 0 ? null : (
        <p className="rounded-[14px] bg-zk-info-bg px-4 py-3 text-sm text-zk-info-fg">
          <span className="font-bold">You’re at the start.</span> This opens for your agent once the marketing tasks are done. You can look around now.
        </p>
      )}

      <section aria-labelledby="open-heading" className={`${agentsSurface} overflow-hidden`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-4">
          <h2 id="open-heading" className="text-lg font-extrabold tracking-tight text-zk-text">Open now</h2>
          <span className="text-xs text-zk-muted">Highest reward first</span>
        </div>
        <div className="grid grid-cols-[88px_minmax(0,1fr)_auto] gap-4 bg-zk-tint/60 px-5 py-2 text-[11px] font-bold uppercase tracking-[0.06em] text-zk-muted">
          <span>Est. reward</span>
          <span>Issue</span>
          <span className="text-right">Next step</span>
        </div>
        <ul className="m-0 list-none divide-y divide-zk-divider p-0">
          {[...SAMPLE].sort((a, b) => b.reward - a.reward).map((item) => (
            <li key={item.number} className="grid grid-cols-[88px_minmax(0,1fr)_auto] items-center gap-4 px-5 py-3.5">
              <span className="justify-self-start rounded-[10px] bg-zk-chip px-2.5 py-1 text-sm font-extrabold tabular-nums text-zk-text2">+${item.reward.toFixed(2)}</span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-zk-text">{item.title}</span>
                <span className="block text-xs text-zk-muted">#{item.number} · {item.project} · {item.detail}</span>
              </span>
              <span aria-disabled="true" className="inline-flex min-h-11 items-center rounded-full bg-zk-seg px-4 text-sm font-bold text-zk-muted">Let {agentName} bid</span>
            </li>
          ))}
        </ul>
        <p className="flex flex-wrap items-center gap-2 border-t border-zk-divider bg-zk-bg px-5 py-3 text-xs text-zk-text2">
          <span className={agentsChipClass}>Draft</span>
          Sample issues to show the page. The real list comes from the public projects open to contributors.
        </p>
      </section>

      <p className="text-sm text-zk-muted">
        Prefer marketing? <Link href="/earn/marketing" className={agentsLink}>See the marketing tasks</Link>
      </p>
    </div>
  );
}
