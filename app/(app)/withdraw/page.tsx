import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { formatZ } from "@/lib/points/rules";
import { WITHDRAW_THRESHOLD, beingChecked, totalEarned } from "@/lib/earnings";

export const metadata = { title: "Withdraw" };
export const dynamic = "force-dynamic";

const card = "rounded-[22px] border border-zk-border bg-zk-surface p-5 sm:p-6";
const PAID = "bg-zk-ok-fg";
const CHECKING = "bg-[repeating-linear-gradient(45deg,#f2c14e_0,#f2c14e_6px,#f7d98a_6px,#f7d98a_12px)]";

/**
 * Withdraw (#earnings): taking your money out, a page of its own, apart from Your earnings. It shows what you can
 * take out, opens at $30, and pays to the wallet kept in Settings → Finance. Payouts themselves aren't built yet,
 * so at $30 it says so rather than pretending to send anything.
 */
export default async function WithdrawPage() {
  const user = await requireUser();
  const [total, checking, wallet] = await Promise.all([
    totalEarned(prisma, user.id),
    beingChecked(prisma, user.id),
    prisma.user.findUnique({ where: { id: user.id }, select: { walletAddress: true } }),
  ]);
  const available = Math.max(0, total);
  const ready = available >= WITHDRAW_THRESHOLD;
  const left = Math.max(0, WITHDRAW_THRESHOLD - available);
  const pct = (value: number) => `${Math.min(100, (Math.max(0, value) / WITHDRAW_THRESHOLD) * 100)}%`;
  const address = wallet?.walletAddress ?? null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-zk-text">Withdraw</h1>
        <p className="mt-1 text-sm text-zk-text2">Take out what you&apos;ve earned. Withdrawals open at {formatZ(WITHDRAW_THRESHOLD)}.</p>
      </div>

      <section aria-labelledby="available" className={card}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="available" className="text-[11px] font-bold uppercase tracking-[0.08em] text-zk-muted">Available</h2>
            <p className="mt-1 text-5xl font-extrabold tracking-tight tabular-nums text-zk-text">{formatZ(available)}</p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${ready ? "bg-zk-ok-bg text-zk-ok-fg" : "bg-zk-warn-bg text-zk-warn-fg"}`}>
            {ready ? "Ready" : `${formatZ(left)} to go`}
          </span>
        </div>
        {ready ? null : (
          <>
            <div
              role="img"
              aria-label={`${formatZ(available)} of ${formatZ(WITHDRAW_THRESHOLD)}, ${formatZ(checking)} being checked`}
              className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-zk-seg"
            >
              <span className={`h-full ${PAID}`} style={{ width: pct(available) }} />
              <span className={`h-full ${CHECKING}`} style={{ width: pct(Math.min(checking, left)) }} />
            </div>
            <p className="mt-2 text-xs text-zk-muted">
              {formatZ(available)} of {formatZ(WITHDRAW_THRESHOLD)}
              {checking > 0 ? `, and ${formatZ(checking)} being checked` : ""}
            </p>
          </>
        )}

        <div className="mt-5 rounded-2xl bg-zk-chip px-4 py-3 text-sm">
          <p className="text-xs font-bold text-zk-muted">Paid to</p>
          {address ? (
            <p className="mt-0.5 break-all font-mono text-zk-text">{address}</p>
          ) : (
            <p className="mt-0.5 text-zk-text2">No wallet yet.</p>
          )}
          <Link href="/settings?section=finance" className="mt-1 inline-block text-sm font-semibold text-zk-accent hover:underline">
            {address ? "Change wallet" : "Add your wallet"}
          </Link>
        </div>

        <button
          type="button"
          disabled
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-electric-blue-strong px-6 text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {ready ? `Withdraw ${formatZ(available)}` : `Withdraw opens at ${formatZ(WITHDRAW_THRESHOLD)}`}
        </button>
        <p className="mt-3 text-center text-xs text-zk-text2">
          {ready ? "Payouts are coming soon. We'll tell you as soon as you can take your money out." : "Keep going: every accepted task adds to it."}
        </p>
      </section>

      <p className="text-center text-sm text-zk-text2">
        See where your money came from on <Link href="/earnings" className="font-semibold text-zk-accent hover:underline">Your earnings</Link>.
      </p>
    </div>
  );
}
