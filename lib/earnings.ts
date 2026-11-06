import { Prisma, type PrismaClient } from "@prisma/client";
import { pointsNumber } from "@/lib/points/rules";

/**
 * Earnings (#earnings): what a person has earned on every project they work on, read straight off the ledger. A
 * balance is the sum of their `PointEntry` rows (lib/points/balance.ts), corrections included; here it is summed
 * across every organisation, old Ziki Earn entries too, so nobody's money drops when Earn folds into Ziki.
 *
 * "Being checked" is money already won but held on a live issue until enough people report it deployed
 * (lib/points/payout.ts): it is not in the ledger yet, so it is not in the total.
 */

type Db = PrismaClient | Prisma.TransactionClient;

/** Withdrawals open once someone has earned this much. */
export const WITHDRAW_THRESHOLD = 30;

/** Everything a person has earned, across every organisation. */
export async function totalEarned(db: Db, userId: string): Promise<number> {
  const sum = await db.pointEntry.aggregate({ where: { userId }, _sum: { points: true } });
  return pointsNumber(sum._sum.points);
}

/** A payment with no task or idea of its own, named by what earned it. */
const ROLE_LABEL: Record<string, string> = {
  signup: "Welcome bonus",
  solver: "Work accepted",
  reporter: "Report",
  reviewer: "Review",
  submission: "Job answer",
  triager: "Triage",
  dispatcher: "Dispatch",
  idea: "Idea",
  comment: "Comment",
  vote: "Vote",
};

export type EarningsByProject = { key: string; name: string; organisation: string; amount: number };
export type EarningsEntry = { id: string; title: string; where: string; amount: number; at: Date };

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

/**
 * The Earnings page: the total, what is being checked, the money by project, and the latest payments. Money with
 * no project (an idea's verdict, an old Ziki Earn task) counts under its organisation.
 */
export async function earningsSummary(db: Db, userId: string) {
  const [total, checking, groups, latest] = await Promise.all([
    totalEarned(db, userId),
    beingChecked(db, userId),
    db.pointEntry.groupBy({ by: ["organisationId", "bugId", "ideaId"], where: { userId }, _sum: { points: true } }),
    db.pointEntry.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 8,
      select: {
        id: true,
        points: true,
        role: true,
        createdAt: true,
        organisation: { select: { name: true } },
        bug: { select: { number: true, title: true, project: { select: { name: true } } } },
        idea: { select: { number: true, title: true, project: { select: { name: true } } } },
      },
    }),
  ]);

  const bugIds = [...new Set(groups.map((group) => group.bugId).filter((id): id is string => Boolean(id)))];
  const ideaIds = [...new Set(groups.map((group) => group.ideaId).filter((id): id is string => Boolean(id)))];
  const organisationIds = [...new Set(groups.map((group) => group.organisationId))];
  const [bugs, ideas, organisations] = await Promise.all([
    bugIds.length ? db.bug.findMany({ where: { id: { in: bugIds } }, select: { id: true, project: { select: { id: true, name: true } } } }) : [],
    ideaIds.length ? db.idea.findMany({ where: { id: { in: ideaIds } }, select: { id: true, project: { select: { id: true, name: true } } } }) : [],
    db.organisation.findMany({ where: { id: { in: organisationIds } }, select: { id: true, name: true } }),
  ]);
  const projectOfBug = new Map(bugs.map((bug) => [bug.id, bug.project]));
  const projectOfIdea = new Map(ideas.map((idea) => [idea.id, idea.project]));
  const organisationName = new Map(organisations.map((organisation) => [organisation.id, organisation.name]));

  const byProject = new Map<string, EarningsByProject>();
  for (const group of groups) {
    const project = (group.bugId ? projectOfBug.get(group.bugId) : null) ?? (group.ideaId ? projectOfIdea.get(group.ideaId) : null) ?? null;
    const organisation = organisationName.get(group.organisationId) ?? "";
    const key = project ? `project:${project.id}` : `organisation:${group.organisationId}`;
    const row = byProject.get(key) ?? { key, name: project?.name ?? organisation, organisation, amount: 0 };
    row.amount += pointsNumber(group._sum.points);
    byProject.set(key, row);
  }

  return {
    total,
    checking,
    byProject: [...byProject.values()].filter((row) => Math.abs(row.amount) >= 0.005).sort((a, b) => b.amount - a.amount),
    latest: latest.map((entry): EarningsEntry => {
      const item = entry.bug ?? entry.idea;
      const project = item?.project?.name ?? entry.organisation.name;
      return {
        id: entry.id,
        title: item ? item.title : (ROLE_LABEL[entry.role] ?? "Payment"),
        where: item ? `${project} · #${item.number}` : entry.organisation.name,
        amount: pointsNumber(entry.points),
        at: entry.createdAt,
      };
    }),
  };
}
