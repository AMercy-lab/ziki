"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { canManageProject } from "@/lib/project-permissions";
import { orgPath, overviewPath } from "@/lib/project-paths";

export type JoinRequestActionResult = {
  ok?: boolean;
  error?: string;
};

/**
 * Apply or re-apply to join an open project as an external contributor.
 */
export async function requestToJoinProjectAction(formData: FormData): Promise<JoinRequestActionResult> {
  const user = await requireUser();
  const projectId = String(formData.get("projectId") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim().slice(0, 1000);

  if (!projectId) return { error: "Project ID is required." };

  const project = await prisma.project.findFirst({
    where: { id: projectId, archivedAt: null },
    select: { id: true, slug: true, name: true, tenantId: true, isOpenForContributors: true, visibility: true },
  });

  if (!project) return { error: "Project not found." };
  if (!project.isOpenForContributors && project.visibility !== "public") {
    return { error: "This project is not currently accepting join requests." };
  }

  // Check if already an org member or project member
  const [isOrgMember, isProjectMember] = await Promise.all([
    prisma.membership.findUnique({ where: { tenantId_userId: { tenantId: project.tenantId, userId: user.id } } }),
    prisma.projectMembership.findUnique({ where: { projectId_userId: { projectId, userId: user.id } } }),
  ]);

  if (isOrgMember || isProjectMember) {
    return { error: "You are already a member of this project." };
  }

  // Upsert join request (re-apply if previously rejected)
  await prisma.projectJoinRequest.upsert({
    where: { projectId_userId: { projectId, userId: user.id } },
    create: {
      projectId,
      userId: user.id,
      message: message || null,
      status: "pending",
    },
    update: {
      message: message || null,
      status: "pending",
      reviewedBy: null,
      reviewedAt: null,
    },
  });

  // Notify organization managers
  const managers = await prisma.membership.findMany({
    where: { tenantId: project.tenantId, role: { in: ["owner", "admin"] } },
    select: { userId: true },
  });

  if (managers.length > 0) {
    await prisma.notification.createMany({
      data: managers.map((m) => ({
        userId: m.userId,
        tenantId: project.tenantId,
        kind: "join_request",
        title: `${user.name || user.email} requested to join ${project.name}`,
        url: orgPath(project.slug, "invites"),
      })),
      skipDuplicates: true,
    }).catch(() => {});
  }

  revalidatePath("/discover");
  revalidatePath(orgPath(project.slug, "invites"));
  return { ok: true };
}

/**
 * Accept a pending join request. Org admins only.
 */
export async function acceptJoinRequestAction(formData: FormData): Promise<JoinRequestActionResult> {
  const user = await requireUser();
  const requestId = String(formData.get("requestId") ?? "").trim();
  if (!requestId) return { error: "Request ID is required." };

  const joinRequest = await prisma.projectJoinRequest.findUnique({
    where: { id: requestId },
    include: { project: { select: { id: true, slug: true, name: true, tenantId: true } } },
  });

  if (!joinRequest || joinRequest.status !== "pending") {
    return { error: "Join request not found or already reviewed." };
  }

  if (!(await canManageProject(user, joinRequest.project.tenantId))) {
    return { error: "Only organization owners and admins can accept join requests." };
  }

  await prisma.$transaction(async (tx) => {
    // 1. Update request status
    await tx.projectJoinRequest.update({
      where: { id: requestId },
      data: {
        status: "accepted",
        reviewedBy: user.id,
        reviewedAt: new Date(),
      },
    });

    // 2. Add ProjectMembership
    await tx.projectMembership.upsert({
      where: { projectId_userId: { projectId: joinRequest.projectId, userId: joinRequest.userId } },
      create: { projectId: joinRequest.projectId, userId: joinRequest.userId },
      update: {},
    });

    // 3. Notify the applicant
    await tx.notification.create({
      data: {
        userId: joinRequest.userId,
        tenantId: joinRequest.project.tenantId,
        kind: "join_request_accepted",
        title: `Your request to join ${joinRequest.project.name} was accepted!`,
        url: overviewPath(joinRequest.project.slug),
      },
    });
  });

  revalidatePath(orgPath(joinRequest.project.slug, "invites"));
  revalidatePath(orgPath(joinRequest.project.slug, "members"));
  revalidatePath("/discover");
  return { ok: true };
}

/**
 * Reject a pending join request. Org admins only.
 */
export async function rejectJoinRequestAction(formData: FormData): Promise<JoinRequestActionResult> {
  const user = await requireUser();
  const requestId = String(formData.get("requestId") ?? "").trim();
  if (!requestId) return { error: "Request ID is required." };

  const joinRequest = await prisma.projectJoinRequest.findUnique({
    where: { id: requestId },
    include: { project: { select: { id: true, slug: true, name: true, tenantId: true } } },
  });

  if (!joinRequest || joinRequest.status !== "pending") {
    return { error: "Join request not found or already reviewed." };
  }

  if (!(await canManageProject(user, joinRequest.project.tenantId))) {
    return { error: "Only organization owners and admins can reject join requests." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.projectJoinRequest.update({
      where: { id: requestId },
      data: {
        status: "rejected",
        reviewedBy: user.id,
        reviewedAt: new Date(),
      },
    });

    await tx.notification.create({
      data: {
        userId: joinRequest.userId,
        tenantId: joinRequest.project.tenantId,
        kind: "join_request_rejected",
        title: `Your request to join ${joinRequest.project.name} was not accepted`,
        url: "/discover",
      },
    });
  });

  revalidatePath(orgPath(joinRequest.project.slug, "invites"));
  revalidatePath("/discover");
  return { ok: true };
}

/**
 * Remove an external contributor from a project. Org admins only.
 */
export async function removeProjectMemberAction(formData: FormData): Promise<JoinRequestActionResult> {
  const user = await requireUser();
  const projectId = String(formData.get("projectId") ?? "").trim();
  const targetUserId = String(formData.get("userId") ?? "").trim();

  if (!projectId || !targetUserId) return { error: "Project and user IDs are required." };

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { tenantId: true, slug: true },
  });

  if (!project) return { error: "Project not found." };

  if (!(await canManageProject(user, project.tenantId))) {
    return { error: "Only organization owners and admins can remove project members." };
  }

  await prisma.projectMembership.deleteMany({
    where: { projectId, userId: targetUserId },
  });

  revalidatePath(orgPath(project.slug, "members"));
  revalidatePath("/discover");
  return { ok: true };
}
