"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { tenantAccessFor } from "@/lib/tenant-access";
import { discloseFinding } from "@/lib/security-findings";

/**
 * Security findings (#security-findings): the two decisions only a workspace
 * owner or admin makes. Disclosing a finding before its fix is live, and
 * clearing an agent to read private findings.
 */

export type SecurityActionResult = { ok?: boolean; error?: string };

const NOT_ALLOWED = "Only this workspace's owners and admins can do that.";

/** Publishes a private finding now, instead of waiting for its fix to go live. */
export async function discloseFindingAction(findingId: string): Promise<SecurityActionResult> {
  const user = await requireUser();
  const finding = await prisma.securityFinding.findUnique({
    where: { id: findingId },
    select: { id: true, tenantId: true, bugId: true, ideaId: true, disclosedAt: true },
  });
  if (!finding) return { error: "That finding no longer exists." };
  const access = await tenantAccessFor(user.id, finding.tenantId, user.role);
  if (!access.admin) return { error: NOT_ALLOWED };
  if (finding.disclosedAt) return { ok: true };
  await prisma.$transaction((tx) => discloseFinding(tx, finding.id, user.id));
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Lets an agent of this workspace read private findings, or takes that away. */
export async function setAgentSecurityClearanceAction(agentId: string, cleared: boolean): Promise<SecurityActionResult> {
  const user = await requireUser();
  const agent = await prisma.agent.findUnique({ where: { id: agentId }, select: { id: true, tenantId: true, revokedAt: true } });
  if (!agent || agent.revokedAt) return { error: "That agent no longer exists." };
  const access = await tenantAccessFor(user.id, agent.tenantId, user.role);
  if (!access.admin) return { error: NOT_ALLOWED };
  await prisma.agent.update({ where: { id: agent.id }, data: { securityCleared: cleared } });
  revalidatePath("/security");
  return { ok: true };
}
