import { Prisma, type PointRole, type PrismaClient } from "@prisma/client";
import { pointsNumber } from "@/lib/points/rules";
import { issueHref } from "@/lib/issue-ref";

/**
 * Earnings (#earnings): what a person and their agents have earned on every project they work on, read straight off
 * the ledger. A balance is the sum of their `PointEntry` rows (lib/points/balance.ts), corrections included; here it
 * is summed across every organisation, old Ziki Earn entries too, so nobody's money drops when Earn folds into Ziki.
 *
 * "Being checked" is money already won but held on a live issue until enough people report it deployed
 * (lib/points/payout.ts): it is not in the ledger yet, so it is not in the total.
 */

type Db = PrismaClient | Prisma.TransactionClient;

/** Withdrawals open once someone has earned this much: the goal the Earnings page counts towards. */
export const WITHDRAW_THRESHOLD = 30;

/** Everything a person has earned, across every organisation. */
export async function totalEarned(db: Db, userId: string): Promise<number> {
  const sum = await db.pointEntry.aggregate({ where: { userId }, _sum: { points: true } });
  return pointsNumber(sum._sum.points);
}

/** A held award, as lib/points/payout.ts keeps it on the issue. */
type HeldAward = { userId?: unknown; points?: unknown };

/** Money won on live issues that is waiting for the deploy reports before it is paid. */
export async function beingChecked(db: Db, userId: string): Promise<number> {
  const bugs = await db.bug.findMany({
    where: { payoutReleasedAt: null, heldPayout: { not: Prisma.AnyNull } },
    select: { heldPayout: true },
    take: 500,
  });
  let held = 0;
  for (const bug of bugs) {
    if (!Array.isArray(bug.heldPayout)) continue;
    for (const award of bug.heldPayout as HeldAward[]) {
      if (award && award.userId === userId && typeof award.points === "number") held += award.points;
    }
  }
  return held;
}

/** Where the money came from, in the few groups a person thinks in. Order is the bar's order. */
export const SOURCE_GROUPS = [
  { key: "solved", label: "Solved issues", roles: ["solver", "dispatcher", "submission"] },
  { key: "reviews", label: "Accepted reviews", roles: ["reviewer"] },
  { key: "confirmations", label: "Confirmations", roles: ["triager"] },
  { key: "reported", label: "Reported ideas", roles: ["reporter", "idea"] },
  { key: "small", label: "Verdicts, votes, sign-up", roles: ["vote", "comment", "signup"] },
] as const satisfies readonly { key: string; label: string; roles: readonly PointRole[] }[];

/** What a ledger row says happened, for the activity list. */
const DID: Record<PointRole, string> = {
  solver: "solved",
  reporter: "reported",
  reviewer: "review accepted on",
  triager: "confirmed",
  submission: "research answer accepted on",
  dispatcher: "dispatched",
  idea: "verdict on",
  signup: "",
  comment: "comment upvoted on",
  vote: "vote on",
};

export type EarningsSource = { key: string; label: string; amount: number };
export type EarningsTask = { id: string; title: string; reward: number; where: string; href: string };
export type EarningsActivity = { id: string; who: string; did: string; ref: string | null; amount: number; at: Date };

/**
 * The Earnings page: the total and what is being checked, where the money came from, the open issues that pay the
 * most in the projects the person is in (the fastest way to the goal), and the latest payments.
 */
export async function earningsSummary(db: Db, userId: string) {
  const [total, checking, byRole, solvedCount, latest, memberships, projectMemberships] = await Promise.all([
    totalEarned(db, userId),
    beingChecked(db, userId),
    db.pointEntry.groupBy({ by: ["role"], where: { userId }, _sum: { points: true } }),
    db.pointEntry.count({ where: { userId, role: "solver", points: { gt: 0 } } }),
    db.pointEntry.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 6,
      select: {
        id: true,
        points: true,
        role: true,
        createdAt: true,
        agent: { select: { name: true } },
        bug: { select: { number: true } },
        idea: { select: { number: true } },
      },
    }),
    db.membership.findMany({ where: { userId }, select: { organisationId: true } }),
    db.projectMembership.findMany({ where: { userId }, select: { projectId: true } }),
  ]);

  const amountOf = new Map(byRole.map((row) => [row.role, pointsNumber(row._sum.points)]));
  const sources: EarningsSource[] = SOURCE_GROUPS.map((group) => ({
    key: group.key,
    label: group.label,
    amount: group.roles.reduce((sum, role) => sum + (amountOf.get(role) ?? 0), 0),
  })).filter((source) => source.amount > 0.004);

  const organisationIds = memberships.map((row) => row.organisationId);
  const projectIds = projectMemberships.map((row) => row.projectId);
  const open = organisationIds.length || projectIds.length
    ? await db.bug.findMany({
        where: {
          status: "open",
          substatus: "open",
          isDeleted: false,
          OR: [{ organisationId: { in: organisationIds } }, { projectId: { in: projectIds } }],
        },
        orderBy: [{ reward: "desc" }, { createdAt: "desc" }],
        take: 4,
        select: { id: true, number: true, title: true, reward: true, _count: { select: { bids: true } }, project: { select: { name: true, slug: true, organisation: { select: { slug: true } } } } },
      })
    : [];

  return {
    total,
    checking,
    solvedCount,
    sources,
    tasks: open.map((bug): EarningsTask => ({
      id: bug.id,
      title: bug.title,
      reward: pointsNumber(bug.reward),
      where: `#${bug.number} · ${bug._count.bids === 1 ? "1 bid" : `${bug._count.bids} bids`} · ${bug.project.name}`,
      href: issueHref(bug),
    })),
    activity: latest.map((entry): EarningsActivity => {
      const amount = pointsNumber(entry.points);
      const number = entry.bug?.number ?? entry.idea?.number ?? null;
      return {
        id: entry.id,
        who: amount < 0 ? "Correction" : entry.role === "signup" ? "Welcome bonus" : entry.agent?.name ?? "You",
        did: amount < 0 ? "taken back on" : entry.role === "signup" ? "" : DID[entry.role] ?? "earned on",
        ref: number === null ? null : `#${number}`,
        amount,
        at: entry.createdAt,
      };
    }),
  };
}
