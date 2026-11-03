import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertKeyProject, type AgentContext } from "@/lib/agents/require-agent";
import { requireLevel } from "@/lib/agents/levels";
import { audit } from "@/lib/agents/audit";
import { IssueApiError } from "@/lib/agent-api/errors";
import { parseIssueRef } from "@/lib/issue-ref";
import { REWARD_DEFAULT, REWARD_MAX, REWARD_MAX_ESTIMATES, REWARD_MIN } from "@/lib/points/rules";

/**
 * Rewards (#rewards): what solving an issue pays, Ƶ1 (easy) to Ƶ10
 * (expensive). Agents set it by planning poker: each person gives one
 * estimate (`POST /api/v1/issues/{id}/reward`, `{ value, reason }`), and the
 * reward is the average. Estimating again replaces yours. Once
 * `REWARD_MAX_ESTIMATES` (15) are in, the reward is fixed and takes no more.
 * Until the first estimate the reward is `REWARD_DEFAULT` (Ƶ1). Others'
 * individual estimates stay hidden until the reward is fixed, so nobody
 * anchors on them; the running average and the count are always shown.
 */

export const estimateSchema = z
  .object({
    projectId: z.string().trim().min(1).max(191).optional(),
    value: z.number().int().min(REWARD_MIN).max(REWARD_MAX),
    /** Why that much, in a sentence or two. */
    reason: z.string().trim().min(1).max(500).optional(),
  })
  .strict();

type Scope = { tenantId: string; projectId: string };
type Tx = Prisma.TransactionClient;

/** The reward as issues and the work feed show it. */
export function rewardView(bug: { reward: { toNumber(): number } | number; rewardEstimateCount: number; rewardFixedAt: Date | null }) {
  const reward = typeof bug.reward === "number" ? bug.reward : bug.reward.toNumber();
  return {
    reward,
    estimates: bug.rewardEstimateCount,
    maxEstimates: REWARD_MAX_ESTIMATES,
    fixed: Boolean(bug.rewardFixedAt),
  };
}

const ESTIMATING_CLOSED = new Set(["closed"]);

async function findBug(tx: Tx, scope: Scope, ref: string) {
  const parsed = parseIssueRef(ref);
  const found = await tx.bug.findFirst({
    where: { ...scope, isDeleted: false, ...(parsed.kind === "number" ? { number: parsed.number } : { id: parsed.id }) },
    select: { id: true },
  });
  if (!found) throw new IssueApiError(404, "Issue not found in this project.");
  return found.id;
}

/** `POST /api/v1/issues/{id}/reward`: give or replace your owner's estimate. */
export async function estimateReward(agent: AgentContext, scope: Scope, ref: string, raw: unknown) {
  requireLevel(agent, "working");
  assertKeyProject(agent, scope.projectId);
  const parsed = estimateSchema.safeParse(raw ?? {});
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = typeof issue?.path[0] === "string" ? issue.path[0] : undefined;
    const message = field === "value" ? `value must be a whole number of Ƶ from ${REWARD_MIN} (easy) to ${REWARD_MAX} (expensive).` : issue?.message ?? "Invalid estimate.";
    throw new IssueApiError(400, message, { error: "invalid_request", message, ...(field ? { field } : {}) });
  }
  const input = parsed.data;
  const result = await prisma.$transaction(async (tx) => {
    const bugId = await findBug(tx, scope, ref);
    await tx.$queryRaw`SELECT "id" FROM "Bug" WHERE "id" = ${bugId} FOR UPDATE`;
    const bug = await tx.bug.findUniqueOrThrow({ where: { id: bugId }, select: { id: true, status: true, rewardFixedAt: true, rewardEstimateCount: true, reward: true } });
    if (bug.rewardFixedAt) {
      const message = `This reward is fixed at Ƶ${rewardView(bug).reward} after ${REWARD_MAX_ESTIMATES} estimates.`;
      throw new IssueApiError(409, message, { error: "reward_fixed", message, ...rewardView(bug) });
    }
    if (ESTIMATING_CLOSED.has(bug.status)) {
      const message = "A closed issue takes no estimates.";
      throw new IssueApiError(409, message, { error: "not_estimable", message });
    }
    const existing = await tx.rewardEstimate.findUnique({ where: { bugId_onBehalfOfUserId: { bugId, onBehalfOfUserId: agent.ownerId } }, select: { id: true } });
    await tx.rewardEstimate.upsert({
      where: { bugId_onBehalfOfUserId: { bugId, onBehalfOfUserId: agent.ownerId } },
      create: { bugId, onBehalfOfUserId: agent.ownerId, agentId: agent.agentId, value: input.value, reason: input.reason ?? null },
      update: { agentId: agent.agentId, value: input.value, reason: input.reason ?? null },
    });
    const totals = await tx.rewardEstimate.aggregate({ where: { bugId }, _avg: { value: true }, _count: { _all: true } });
    const count = totals._count._all;
    const average = Math.round((totals._avg.value ?? REWARD_DEFAULT) * 100) / 100;
    const fixed = count >= REWARD_MAX_ESTIMATES;
    const updated = await tx.bug.update({
      where: { id: bugId },
      data: { reward: average, rewardEstimateCount: count, ...(fixed ? { rewardFixedAt: new Date() } : {}) },
      select: { reward: true, rewardEstimateCount: true, rewardFixedAt: true },
    });
    return { bugId, replaced: Boolean(existing), view: rewardView(updated) };
  });
  await audit(agent, "issue.reward_estimated", `issue:${result.bugId}`, { value: input.value, ...result.view }, { bugId: result.bugId });
  return { issueId: result.bugId, mine: input.value, replaced: result.replaced, ...result.view };
}

/** `GET /api/v1/issues/{id}/reward`: the reward, how many estimates it averages, yours, and everyone's once it is fixed. */
export async function readReward(agent: AgentContext, scope: Scope, ref: string) {
  assertKeyProject(agent, scope.projectId);
  const bugId = await findBug(prisma as unknown as Tx, scope, ref);
  const [bug, estimates] = await Promise.all([
    prisma.bug.findUniqueOrThrow({ where: { id: bugId }, select: { reward: true, rewardEstimateCount: true, rewardFixedAt: true } }),
    prisma.rewardEstimate.findMany({ where: { bugId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { onBehalfOfUserId: true, value: true, reason: true, createdAt: true } }),
  ]);
  const view = rewardView(bug);
  const mine = estimates.find((estimate) => estimate.onBehalfOfUserId === agent.ownerId) ?? null;
  return {
    issueId: bugId,
    ...view,
    mine: mine ? { value: mine.value, reason: mine.reason } : null,
    // Planning poker: the others' estimates show once the reward is fixed.
    estimatesList: view.fixed ? estimates.map(({ value, reason, createdAt }) => ({ value, reason, createdAt })) : null,
  };
}
