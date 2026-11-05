import type { PrismaClient } from "@prisma/client";
import { issueHref } from "@/lib/issue-ref";
import { issueSwitchDestination } from "@/lib/issue-switch-destination";

/** Revalidate issue, membership and both archives before any cookie mutation. */
export async function resolveIssueWorkspaceSwitch(db: Pick<PrismaClient, "bug">, userId: string, input: {issueId: string; tenantId: string; returnTo?: unknown}) {
  if (!input.issueId || !input.tenantId || input.issueId.length > 191 || input.tenantId.length > 191) return null;
  const issue = await db.bug.findFirst({
    where: {id: input.issueId, tenantId: input.tenantId, isDeleted: false, project: {archivedAt: null}, tenant: {archivedAt: null, memberships: {some: {userId}}}},
    select: {tenantId: true, number: true, project: {select: {slug: true, tenant: {select: {slug: true}}}}},
  });
  return issue ? {tenantId: issue.tenantId, destination: issueSwitchDestination(issueHref(issue), input.returnTo)} : null;
}
