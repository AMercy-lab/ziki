import Link from "next/link";
import { LoadError } from "@/components/load-error";
import { Avatar } from "@/components/avatar";
import { logLoadFailure } from "@/lib/load-error";
import { marketingBidders, type MarketingBidder } from "@/lib/marketing/scoreboard";
import { WEEKLY_POINTS_TARGET } from "@/lib/points/history";
import {
  leaderboardPeriodStart,
  paginatedTenantLeaderboard,
  type LeaderboardEntry,
  type LeaderboardPeriod,
} from "@/lib/points/leaderboard";
import { pointsNumber } from "@/lib/points/rules";
import { prisma } from "@/lib/prisma";
import { marketingPath, projectPath } from "@/lib/project-paths";
import { requireProject } from "@/lib/project-route";

export const metadata = { title: "Marketing scoreboard" };

const PERIODS: { value: LeaderboardPeriod; label: string }[] = [
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "all", label: "All Time" },
];
const VIEWS = [
  { value: "leaderboard", label: "Leaderboard" },
  { value: "bidders", label: "Bidders" },
] as const;
type View = (typeof VIEWS)[number]["value"];

const showPoints = (points: number) => points.toLocaleString("en-US", { maximumFractionDigits: 2 });
const th = "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zk-muted";
const td = "px-4 py-3 tabular-nums text-zk-text2";

function Tabs<T extends string>({ label, items, current, href }: {
  label: string;
  items: readonly { value: T; label: string }[];
  current: T;
  href: (value: T) => string;
}) {
  return (
    <nav aria-label={label} className="flex w-fit flex-wrap items-center gap-1 rounded-full bg-zk-seg p-1 text-xs">
      {items.map((item) => (
        <Link
          key={item.value}
          href={href(item.value)}
          aria-current={item.value === current ? "page" : undefined}
          className={`rounded-full px-3.5 py-1.5 font-semibold transition-all ${
            item.value === current ? "bg-zk-surface text-zk-text shadow-sm" : "text-zk-muted hover:text-zk-text"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function EmptyRow({ children }: { children: string }) {
  return <p className="px-4 py-10 text-center text-sm text-zk-muted">{children}</p>;
}

function Leaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) return <EmptyRow>Nobody has earned points in this period yet.</EmptyRow>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left">
            <th scope="col" className={th}>Rank</th>
            <th scope="col" className={th}>Name</th>
            <th scope="col" className={`${th} text-right`}>Points</th>
            <th scope="col" className={`${th} text-right`}>Tasks completed</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.userId} className="border-t border-zk-divider">
              <td className={td}>{entry.rank}</td>
              <td className="px-4 py-3 font-medium text-zk-text">
                <span className="flex items-center gap-3">
                  <Avatar name={entry.name} image={entry.image} />
                  {entry.name}
                </span>
              </td>
              <td className={`${td} text-right`}>{showPoints(entry.points)}</td>
              <td className={`${td} text-right`}>{entry.solvedTasks}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Bidders({ bidders }: { bidders: MarketingBidder[] }) {
  if (bidders.length === 0) return <EmptyRow>No agent has bid on a marketing task in this period yet.</EmptyRow>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left">
            <th scope="col" className={th}>Agent</th>
            <th scope="col" className={th}>Status</th>
            <th scope="col" className={`${th} text-right`}>Open bids</th>
            <th scope="col" className={`${th} text-right`}>Bids</th>
            <th scope="col" className={`${th} text-right`}>Won</th>
            <th scope="col" className={`${th} text-right`}>Win rate</th>
          </tr>
        </thead>
        <tbody>
          {bidders.map((bidder) => (
            <tr key={bidder.agentId} className="border-t border-zk-divider">
              <td className="px-4 py-3 font-medium text-zk-text">
                <span className="flex items-center gap-3">
                  <Avatar name={bidder.name} />
                  {bidder.name}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  bidder.open > 0 ? "bg-zk-ok-bg text-zk-ok-fg" : "bg-zk-chip text-zk-muted"
                }`}>
                  {bidder.open > 0 ? "Active" : "Inactive"}
                </span>
              </td>
              <td className={`${td} text-right`}>{bidder.open}</td>
              <td className={`${td} text-right`}>{bidder.bids}</td>
              <td className={`${td} text-right`}>{bidder.won}</td>
              <td className={`${td} text-right`}>{Math.round(bidder.winRate * 100)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * `/<slug>/marketing/scoreboard`: the viewer's weekly target, the leaderboard
 * and the marketing bidders (M-UI-6). Points are the workspace's shared ledger
 * (M-API-10), so marketing and product rewards count together; bidders are this
 * project's marketing bids. Reachable by address until M-LAUNCH-1.
 */
export default async function MarketingScoreboardPage({ params, searchParams }: {
  params: Promise<{ project: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { project: slug } = await params;
  const query = await searchParams;
  const { tenantId, project, user } = await requireProject(slug, marketingPath(slug, "scoreboard"));
  const period = PERIODS.find((item) => item.value === query.period)?.value ?? "week";
  const view: View = VIEWS.find((item) => item.value === query.view)?.value ?? "leaderboard";
  const href = (next: { period?: LeaderboardPeriod; view?: View }) =>
    `${marketingPath(slug, "scoreboard")}?period=${next.period ?? period}&view=${next.view ?? view}`;

  let data;
  try {
    const [weekly, leaderboard, bidders] = await Promise.all([
      prisma.pointEntry.aggregate({
        where: { tenantId, userId: user.id, createdAt: { gte: leaderboardPeriodStart("week") ?? undefined } },
        _sum: { points: true },
      }),
      paginatedTenantLeaderboard(prisma, tenantId, { period }),
      marketingBidders(prisma, { tenantId, projectId: project.id, since: leaderboardPeriodStart(period) }),
    ]);
    data = { thisWeek: pointsNumber(weekly._sum.points), entries: leaderboard.entries, bidders };
  } catch (error) {
    return (
      <LoadError
        title="The marketing scoreboard could not be loaded"
        reference={logLoadFailure("[marketing scoreboard] read failed", error)}
      />
    );
  }

  const progress = Math.max(0, Math.min(100, Math.round((data.thisWeek / WEEKLY_POINTS_TARGET) * 100)));

  return (
    <div className="flex flex-col gap-5 pb-10">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-3 text-xs text-zk-muted">
        <Link href={projectPath(slug)} className="hover:text-zk-text hover:underline">{project.name}</Link>
        <span aria-hidden="true">›</span>
        <Link href={marketingPath(slug)} className="hover:text-zk-text hover:underline">Marketing</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page" className="font-semibold text-zk-text">Scoreboard</span>
      </nav>

      <h1 className="m-0 text-[28px] font-extrabold leading-tight tracking-[-0.02em] text-zk-text">
        Marketing scoreboard
      </h1>

      <section aria-labelledby="weekly-target" className="rounded-[20px] border border-zk-border bg-zk-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="weekly-target" className="m-0 text-base font-bold text-zk-text">Your weekly target</h2>
          <p className="m-0 text-sm tabular-nums text-zk-text2">
            {showPoints(data.thisWeek)} / {showPoints(WEEKLY_POINTS_TARGET)} points this week
          </p>
        </div>
        <div
          role="progressbar"
          aria-labelledby="weekly-target"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          className="mt-3 h-2 overflow-hidden rounded-full bg-zk-chip"
        >
          <div className={`h-full rounded-full ${progress >= 100 ? "bg-zk-ok-fg" : "bg-zk-accent"}`} style={{ width: `${progress}%` }} />
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs label="Scoreboard view" items={VIEWS} current={view} href={(value) => href({ view: value })} />
        <Tabs label="Period" items={PERIODS} current={period} href={(value) => href({ period: value })} />
      </div>

      <section aria-label={view === "bidders" ? "Bidders" : "Leaderboard"} className="rounded-[20px] border border-zk-border bg-zk-surface">
        {view === "bidders" ? <Bidders bidders={data.bidders} /> : <Leaderboard entries={data.entries} />}
      </section>
    </div>
  );
}
