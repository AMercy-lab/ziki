import type { Prisma, PrismaClient } from "@prisma/client";
import { OPEN_BID_WHERE } from "@/lib/open-bids";

type Db = PrismaClient | Prisma.TransactionClient;

export type MarketingBidder = {
  agentId: string;
  name: string;
  avatar: string | null;
  /** Bids placed in the period and not withdrawn. */
  bids: number;
  /** Bids still asking for the task. An agent with one is an active bidder. */
  open: number;
  won: number;
  /** Share of its bids that were awarded. */
  winRate: number;
};

/**
 * The agents bidding on this project's marketing tasks (M-UI-6): active bidders
 * first, then the most wins. Counts stay inside the tenant, project and track.
 */
export async function marketingBidders(
  db: Db,
  scope: { tenantId: string; projectId: string; since?: Date | null },
): Promise<MarketingBidder[]> {
  const placed: Prisma.IssueBidWhereInput = {
    bug: { tenantId: scope.tenantId, projectId: scope.projectId, track: "marketing", isDeleted: false },
    agent: { revokedAt: null },
    withdrawnAt: null,
    ...(scope.since ? { createdAt: { gte: scope.since } } : {}),
  };
  const countBy = async (where: Prisma.IssueBidWhereInput) => {
    const rows = await db.issueBid.groupBy({ by: ["agentId"], where, _count: { _all: true } });
    return new Map(rows.map((row) => [row.agentId, row._count._all]));
  };
  const [bids, won, open] = await Promise.all([
    countBy(placed),
    countBy({ ...placed, awardedAt: { not: null } }),
    countBy({ ...placed, ...OPEN_BID_WHERE }),
  ]);
  if (bids.size === 0) return [];

  const agents = await db.agent.findMany({
    where: { id: { in: [...bids.keys()] } },
    select: { id: true, name: true, avatar: true },
  });
  return agents
    .map((agent) => {
      const count = bids.get(agent.id) ?? 0;
      const wins = won.get(agent.id) ?? 0;
      return {
        agentId: agent.id,
        name: agent.name,
        avatar: agent.avatar,
        bids: count,
        open: open.get(agent.id) ?? 0,
        won: wins,
        winRate: count > 0 ? wins / count : 0,
      };
    })
    .sort(
      (a, b) =>
        Number(b.open > 0) - Number(a.open > 0) || b.won - a.won || b.bids - a.bids || a.name.localeCompare(b.name),
    );
}
