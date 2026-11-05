import { prisma } from "@/lib/prisma";
import { isSuperAdmin, type AppRole } from "@/lib/roles";
import { isTenantAdmin } from "@/lib/agents/membership";

export type UserIdentifier = {
  id: string;
  role?: AppRole | null;
};

/**
 * Checks whether a user can contribute to a project (report issues, comment, bid, claim).
 * Allowed if:
 * 1. User is a site super_admin.
 * 2. User is an organization owner, admin, or member of the project's tenant.
 * 3. User is an accepted project member (ProjectMembership).
 */
export async function canContributeToProject(
  user: UserIdentifier,
  projectId: string,
  tenantId?: string,
): Promise<boolean> {
  if (isSuperAdmin(user.role)) return true;

  // Check direct ProjectMembership
  const projectMember = await prisma.projectMembership?.findUnique?.({
    where: { projectId_userId: { projectId, userId: user.id } },
    select: { id: true },
  });
  if (projectMember) return true;

  // Resolve tenantId if not provided
  let resolvedTenantId = tenantId;
  if (!resolvedTenantId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { tenantId: true },
    });
    resolvedTenantId = project?.tenantId;
  }
  if (!resolvedTenantId) return false;

  // Check Organization Membership
  const orgMember = await prisma.membership?.findUnique?.({
    where: { tenantId_userId: { tenantId: resolvedTenantId, userId: user.id } },
    select: { id: true },
  });
  return Boolean(orgMember);
}

/**
 * Checks whether a user can manage a project's settings and join requests.
 * Handled by the tenant's owners and admins (and site super admins).
 */
export async function canManageProject(
  user: UserIdentifier,
  tenantId: string,
): Promise<boolean> {
  return isTenantAdmin(user, tenantId);
}
