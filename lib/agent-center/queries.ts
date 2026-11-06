import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isOrganisationAdminRole } from "@/lib/agents/membership";
import { auditWhere } from "@/lib/agent-audit/visibility";
import { ACTIVITY_PAGE_SIZE, activityBefore, activityFilters, activityPage, type ActivityParams } from "./paging";

const issueSelect = { id: true, number: true, title: true, status: true, pullRequestUrl: true, project: { select: { slug: true, organisation: { select: { slug: true } } } } } as const;
const orderBy = [{ createdAt: "desc" }, { id: "desc" }] as const;

/** Session-derived identity only. Membership is rechecked before any data read. */
export async function loadAgentCenter(userId: string, organisationId: string | null, params: ActivityParams = {}) {
  if (!organisationId) return null;
  const member = await prisma.membership.findUnique({
    where: { organisationId_userId: { organisationId, userId } },
    select: { role: true },
  });
  if (!member) return null;
  // Organisation owners and admins see every agent's work, including site admins.
  const isAdmin = isOrganisationAdminRole(member.role);
  const filters = activityFilters(params);
  const bug: Prisma.BugWhereInput = {
    organisationId, isDeleted: false,
    ...(filters.issueNumber !== undefined ? { number: filters.issueNumber } : {}),
  };
  const agent: Prisma.AgentWhereInput = { organisationId, ...(isAdmin ? {} : { ownerUserId: userId }) };
  const optionalBug = filters.issueNumber !== undefined ? { bug } : { OR: [{ bugId: null }, { bug }] };

  const [questions, work, events] = await Promise.all([
    prisma.agentQuestion.findMany({
      where: { AND: [
        // Even admins only read their own private requests. No answers selected.
        { ownerUserId: userId, agent: { organisationId }, answeredAt: null },
        optionalBug, activityBefore(params.questions) ?? {},
      ] },
      orderBy: [...orderBy], take: ACTIVITY_PAGE_SIZE + 1,
      select: { id: true, createdAt: true, body: true, agent: { select: { name: true } }, bug: { select: issueSelect } },
    }),
    prisma.issueClaim.findMany({
      where: { AND: [
        { agent, bug, ...(filters.state !== "all" ? { status: filters.state } : {}) },
        activityBefore(params.work) ?? {},
      ] },
      orderBy: [...orderBy], take: ACTIVITY_PAGE_SIZE + 1,
      select: {
        id: true, createdAt: true, status: true, deliverBy: true, waitingOnOwnerSince: true,
        lastHeartbeatAt: true, releaseReason: true, releasedAt: true,
        agent: { select: { name: true } }, bug: { select: issueSelect },
      },
    }),
    prisma.agentAuditEvent.findMany({
      where: { AND: [
        auditWhere({ kind: "all", organisationId }), { agent }, optionalBug,
        activityBefore(params.events) ?? {},
      ] },
      orderBy: [...orderBy], take: ACTIVITY_PAGE_SIZE + 1,
      // Summary only: private question/message text can occur in raw payloads.
      select: { id: true, createdAt: true, action: true, undoneAt: true, agent: { select: { name: true } }, bug: { select: issueSelect } },
    }),
  ]);
  return { isAdmin, questions: activityPage(questions), work: activityPage(work), events: activityPage(events) };
}
