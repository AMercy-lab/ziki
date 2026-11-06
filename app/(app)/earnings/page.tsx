import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { formatZ } from "@/lib/points/rules";
import { WITHDRAW_THRESHOLD, earningsSummary } from "@/lib/earnings";
import { agentsLink, agentsSurface } from "@/app/(app)/settings/agents/agents-ui";

export const metadata = { title: "Earnings" };
export const dynamic = "force-dynamic";

const when = new Intl.DateTimeFormat("en", { day: "numeric", month: "short" });

/**
 * Earnings (#earnings): what you've earned on every project you work on, in one place in the normal app. The
 * header's $ opens it from any page. The total and the money by project come straight off the ledger; "being
 * checked" is money won on live work that is paid once enough people report it deployed. Withdrawals open at
 * $30 and go to the wallet kept in Settings → Finance; payouts themselves aren't built yet.
 */
export default async function EarningsPage() {
  const user = await requireUser();
  const { total, checking, byProject, latest } = await earningsSummary(prisma, user.id);
  const earned = Math.max(0, total);
  const ready = earned >= WITHDRAW_THRESHOLD;
  const left = Math.max(0, WITHDRAW_THRESHOLD - earned);
  const pct = (value: number) => `${Math.min(100, (Math.max(0, value) / WITHDRAW_THRESHOLD) * 100)}%`;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zk-text">Earnings</h1>
          <p className="mt-1 text-sm text-zk-text2">What you&apos;ve earned on every project you work on.</p>
        </div>
        <span
          aria-disabled={!ready}
          className={`inline-flex min-h-11 items-center rounded-full bg-electric-blue-strong px-6 text-sm font-bold text-white ${ready ? "" : "opacity-50"}`}
        >
          {ready ? "Withdraw" : `Withdraw (${formatZ(left)} to go)`}
        </span>
      </div>

      <section aria-labelledby="earned" className={`${agentsSurface} p-6`}>
        <div className="flex flex-wrap gap-x-12 gap-y-4">
          <div>
            <h2 id="earned" className="text-xs font-bold uppercase tracking-[0.06em] text-zk-muted">Earned</h2>
            <p className="mt-1 text-4xl font-extrabold tracking-tight tabular-nums text-zk-text">{formatZ(earned)}</p>
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.06em] text-zk-muted">Being checked</h2>
            <p className="mt-1 text-4xl font-extrabold tracking-tight tabular-nums text-zk-warn-fg">{formatZ(checking)}</p>
          </div>
        </div>
        <div
          role="img"
          aria-label={`${formatZ(earned)} earned of ${formatZ(WITHDRAW_THRESHOLD)}, ${formatZ(checking)} being checked`}
          className="mt-5 flex h-3 overflow-hidden rounded-full bg-zk-seg"
        >
          <span className="h-full bg-zk-ok-fg" style={{ width: pct(earned) }} />
          <span className="h-full bg-[repeating-linear-gradient(45deg,#f2c14e_0,#f2c14e_6px,#f7d98a_6px,#f7d98a_12px)]" style={{ width: pct(Math.min(checking, left)) }} />
        </div>
        <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-zk-muted">
          <span className="tabular-nums">{formatZ(earned)} of {formatZ(WITHDRAW_THRESHOLD)}</span>
          <span>
            {ready ? "You can withdraw. Payouts are coming soon: we'll tell you when you can take it out." : `Withdraw opens at ${formatZ(WITHDRAW_THRESHOLD)}.`}{" "}
            Paid to the wallet in <Link href="/settings?section=finance" className={agentsLink}>Settings → Finance</Link>
          </span>
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-[2fr_3fr]">
        <section aria-labelledby="by-project" className={`${agentsSurface} p-6`}>
          <h2 id="by-project" className="text-base font-extrabold text-zk-text">By project</h2>
          {byProject.length === 0 ? (
            <p className="mt-3 text-sm text-zk-text2">Nothing yet. Join a project and your agent&apos;s accepted work shows here.</p>
          ) : (
            <ul className="m-0 mt-2 list-none divide-y divide-zk-divider p-0">
              {byProject.map((row) => (
                <li key={row.key} className="flex items-center gap-3 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-zk-text">{row.name}</span>
                    {row.organisation && row.organisation !== row.name ? <span className="block truncate text-xs text-zk-muted">{row.organisation}</span> : null}
                  </span>
                  <span className="text-sm font-extrabold tabular-nums text-zk-ok-fg">{formatZ(row.amount)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-sm text-zk-text2">
            Earn on more projects in <Link href="/discover?open=true" className={agentsLink}>Discover</Link>.
          </p>
        </section>

        <section aria-labelledby="latest" className={`${agentsSurface} p-6`}>
          <h2 id="latest" className="text-base font-extrabold text-zk-text">Latest</h2>
          {latest.length === 0 ? (
            <p className="mt-3 text-sm text-zk-text2">Your payments show here as work is accepted.</p>
          ) : (
            <ul className="m-0 mt-2 list-none divide-y divide-zk-divider p-0">
              {latest.map((entry) => (
                <li key={entry.id} className="flex items-center gap-3 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-zk-text">{entry.title}</span>
                    <span className="block truncate text-xs text-zk-muted">{entry.where} · {when.format(entry.at)}</span>
                  </span>
                  <span className={`text-sm font-extrabold tabular-nums ${entry.amount < 0 ? "text-zk-bad-fg" : "text-zk-ok-fg"}`}>{formatZ(entry.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
