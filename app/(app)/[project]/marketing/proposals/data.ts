import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ProjectContext } from "@/lib/project-route";
import { workflowFor } from "@/lib/workflow";
import { archiveReasonLabel, IDEA_WITHDRAWN_REASON } from "@/lib/idea-archive";
import { ideaVotes, isBadIdea } from "@/lib/idea-rejection";
import { calculatePagination } from "@/lib/pagination";
import type { ProposalItem, ProposalOpinion, ProposalVerdict, ProposalsResult, ProposalsView } from "@/components/marketing/proposals/model";

/**
 * The Marketing section's proposals (M-UI-2). The caller resolves access with
 * requireProject first; every read stays inside that tenant and project and
 * only reads the marketing track. Open proposals are waiting for the verdict
 * that opens them (D2); the rejected view also carries archived
 * ideas, as the product Ideas › Rejected list does.
 */
export async function readProposals(
  { project, tenantId, user }: ProjectContext,
  view: ProposalsView,
  page?: string | string[] | number,
): Promise<ProposalsResult> {
  const base = { tenantId, projectId: project.id, isDeleted: false, track: "marketing" } satisfies Prisma.IdeaWhereInput;
  const openWhere = { ...base, status: "open" } satisfies Prisma.IdeaWhereInput;
  const rejectedWhere = { ...base, status: { in: ["rejected", "archived"] } } satisfies Prisma.IdeaWhereInput;
  const where = view === "rejected" ? rejectedWhere : openWhere;
  const orderBy: Prisma.IdeaOrderByWithRelationInput[] = view === "rejected"
    ? [{ updatedAt: "desc" }, { id: "asc" }]
    : [{ score: "desc" }, { createdAt: "desc" }, { id: "asc" }];

  const [total, openCount, rejectedCount, workflow] = await Promise.all([
    prisma.idea.count({ where }),
    prisma.idea.count({ where: openWhere }),
    prisma.idea.count({ where: rejectedWhere }),
    workflowFor(project.id),
  ]);
  const pagination = calculatePagination({ page, totalCount: total });
  const rows = await prisma.idea.findMany({
    where,
    orderBy,
    skip: pagination.skip,
    take: pagination.take,
    select: {
      id: true,
      number: true,
      title: true,
      summary: true,
      description: true,
      rationale: true,
      status: true,
      score: true,
      createdAt: true,
      rejectedAt: true,
      rejectedByAgentId: true,
      archivedAt: true,
      archivedByAgentId: true,
      archiveReason: true,
      archiveDuplicateOf: true,
      reporterId: true,
      beneficiaryUserId: true,
      type: { select: { name: true } },
      reporter: { select: { name: true } },
      createdByAgent: { select: { ownerUserId: true } },
      verdicts: {
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          opinion: true,
          votes: true,
          summary: true,
          description: true,
          updatedAt: true,
          onBehalfOf: { select: { name: true } },
          agent: { select: { name: true } },
        },
      },
    },
  });

  const ids = rows.map((row) => row.id);
  // The form and the person's own verdict: one working-class verdict per idea (a manager agent's is separate).
  const mine = ids.length
    ? await prisma.ideaVerdict.findMany({
        where: { ideaId: { in: ids }, onBehalfOfUserId: user.id, weightClass: "working" },
        select: { ideaId: true, opinion: true, summary: true, description: true },
      })
    : [];
  const mineByIdea = new Map(mine.map((verdict) => [verdict.ideaId, { opinion: verdict.opinion as ProposalOpinion, summary: verdict.summary, description: verdict.description }]));

  // The agents named by a rejection or archive are stored by id.
  const deciderIds = [...new Set(rows.flatMap((row) => [row.rejectedByAgentId, row.archivedByAgentId]).filter((id): id is string => Boolean(id)))];
  const deciders = deciderIds.length
    ? await prisma.agent.findMany({ where: { id: { in: deciderIds }, tenantId }, select: { id: true, name: true } })
    : [];
  const deciderName = new Map(deciders.map((agent) => [agent.id, agent.name]));

  const items: ProposalItem[] = rows.map((row) => {
    const verdicts: ProposalVerdict[] = row.verdicts.map((verdict) => ({
      id: verdict.id,
      opinion: verdict.opinion as ProposalOpinion,
      votes: verdict.votes,
      summary: verdict.summary,
      description: verdict.description,
      by: verdict.onBehalfOf.name ?? "Someone",
      agentName: verdict.agent?.name ?? null,
      updatedAt: verdict.updatedAt,
    }));
    const votes: Record<ProposalOpinion, number> = { good: 0, bad: 0, neutral: 0 };
    for (const verdict of row.verdicts) votes[verdict.opinion as ProposalOpinion] += verdict.votes;
    const withdrawn = row.archiveReason === IDEA_WITHDRAWN_REASON;
    return {
      id: row.id,
      number: row.number,
      title: row.title,
      summary: row.summary,
      description: row.description,
      rationale: row.rationale,
      typeName: row.type?.name ?? null,
      reporterName: row.reporter?.name ?? null,
      createdAt: row.createdAt,
      score: row.score,
      threshold: workflow.ideaThreshold,
      votes,
      verdicts,
      status: row.status as ProposalItem["status"],
      rejectedAt: row.rejectedAt,
      rejectedBy: row.rejectedAt ? deciderName.get(row.rejectedByAgentId ?? "") ?? "a manager agent" : null,
      archivedAt: row.archivedAt,
      archivedBy: row.archivedAt ? (withdrawn ? "its owner" : deciderName.get(row.archivedByAgentId ?? "") ?? "a manager agent") : null,
      archiveReason: row.archiveReason ? archiveReasonLabel(row.archiveReason, row.archiveDuplicateOf) : null,
      convertible: row.status === "open" && row.score >= workflow.ideaThreshold,
      bad: row.status === "open" && isBadIdea(ideaVotes(verdicts), workflow.ideaThreshold),
      own: row.reporterId === user.id || row.beneficiaryUserId === user.id || row.createdByAgent?.ownerUserId === user.id,
      mine: mineByIdea.get(row.id) ?? null,
    };
  });

  return {
    ok: true,
    items,
    threshold: workflow.ideaThreshold,
    counts: { open: openCount, rejected: rejectedCount },
    total,
    page: pagination.page,
    totalPages: pagination.totalPages,
    from: pagination.from,
    to: pagination.to,
  };
}
