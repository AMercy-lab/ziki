import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    membership: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn(),
    },
    projectMembership: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    projectJoinRequest: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    notification: {
      create: vi.fn().mockResolvedValue({}),
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    $transaction: vi.fn(async (cb: any) => cb(prisma)),
  },
}));

vi.mock("@/lib/auth-helpers", () => ({
  requireUser: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { canContributeToProject, canManageProject } from "@/lib/project-permissions";
import {
  requestToJoinProjectAction,
  acceptJoinRequestAction,
  rejectJoinRequestAction,
  removeProjectMemberAction,
} from "@/app/actions/project-join-requests";

describe("Project Discovery and Hierarchy Permissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("canContributeToProject", () => {
    it("allows site super_admin regardless of membership", async () => {
      const allowed = await canContributeToProject(
        { id: "admin-1", role: "super_admin" },
        "project-1",
        "tenant-1",
      );
      expect(allowed).toBe(true);
    });

    it("allows direct project members", async () => {
      (prisma.projectMembership.findUnique as any).mockResolvedValue({ id: "pm-1" });

      const allowed = await canContributeToProject(
        { id: "user-1", role: "user" },
        "project-1",
        "tenant-1",
      );
      expect(allowed).toBe(true);
      expect(prisma.projectMembership.findUnique).toHaveBeenCalledWith({
        where: { projectId_userId: { projectId: "project-1", userId: "user-1" } },
        select: { id: true },
      });
    });

    it("allows organization members of the project's tenant", async () => {
      (prisma.projectMembership.findUnique as any).mockResolvedValue(null);
      (prisma.membership.findUnique as any).mockResolvedValue({ id: "m-1" });

      const allowed = await canContributeToProject(
        { id: "user-1", role: "user" },
        "project-1",
        "tenant-1",
      );
      expect(allowed).toBe(true);
      expect(prisma.membership.findUnique).toHaveBeenCalledWith({
        where: { tenantId_userId: { tenantId: "tenant-1", userId: "user-1" } },
        select: { id: true },
      });
    });

    it("denies uninvited non-members", async () => {
      (prisma.projectMembership.findUnique as any).mockResolvedValue(null);
      (prisma.membership.findUnique as any).mockResolvedValue(null);

      const allowed = await canContributeToProject(
        { id: "stranger-1", role: "user" },
        "project-1",
        "tenant-1",
      );
      expect(allowed).toBe(false);
    });
  });

  describe("canManageProject", () => {
    it("allows super_admin", async () => {
      const allowed = await canManageProject({ id: "admin-1", role: "super_admin" }, "tenant-1");
      expect(allowed).toBe(true);
    });

    it("allows tenant owners and admins", async () => {
      (prisma.membership.findUnique as any).mockResolvedValue({ role: "owner" });
      expect(await canManageProject({ id: "user-1", role: "user" }, "tenant-1")).toBe(true);

      (prisma.membership.findUnique as any).mockResolvedValue({ role: "admin" });
      expect(await canManageProject({ id: "user-1", role: "user" }, "tenant-1")).toBe(true);
    });

    it("denies regular tenant members", async () => {
      (prisma.membership.findUnique as any).mockResolvedValue({ role: "member" });
      expect(await canManageProject({ id: "user-1", role: "user" }, "tenant-1")).toBe(false);
    });
  });

  describe("requestToJoinProjectAction", () => {
    it("rejects when user is already a member", async () => {
      (requireUser as any).mockResolvedValue({ id: "user-1", name: "Alice", email: "alice@example.com" });
      (prisma.project.findFirst as any).mockResolvedValue({
        id: "p-1",
        name: "Test Project",
        slug: "test-p",
        tenantId: "t-1",
        isOpenForContributors: true,
        visibility: "public",
        tenant: { slug: "test-org" },
      });
      (prisma.membership.findUnique as any).mockResolvedValue({ id: "m-1" });
      (prisma.projectMembership.findUnique as any).mockResolvedValue(null);

      const form = new FormData();
      form.set("projectId", "p-1");
      const res = await requestToJoinProjectAction(form);
      expect(res).toEqual({ error: "You are already a member of this project." });
    });

    it("rejects when project is closed and private", async () => {
      (requireUser as any).mockResolvedValue({ id: "user-1", name: "Alice", email: "alice@example.com" });
      (prisma.project.findFirst as any).mockResolvedValue({
        id: "p-1",
        name: "Test Project",
        slug: "test-p",
        tenantId: "t-1",
        isOpenForContributors: false,
        visibility: "private",
        tenant: { slug: "test-org" },
      });
      (prisma.membership.findUnique as any).mockResolvedValue(null);
      (prisma.projectMembership.findUnique as any).mockResolvedValue(null);

      const form = new FormData();
      form.set("projectId", "p-1");
      const res = await requestToJoinProjectAction(form);
      expect(res).toEqual({ error: "This project is not currently accepting join requests." });
    });

    it("creates join request when project is open", async () => {
      (requireUser as any).mockResolvedValue({ id: "user-1", name: "Alice", email: "alice@example.com" });
      (prisma.project.findFirst as any).mockResolvedValue({
        id: "p-1",
        name: "Test Project",
        slug: "test-p",
        tenantId: "t-1",
        isOpenForContributors: true,
        visibility: "public",
        tenant: { slug: "test-org" },
      });
      (prisma.membership.findUnique as any).mockResolvedValue(null);
      (prisma.projectMembership.findUnique as any).mockResolvedValue(null);
      (prisma.membership.findMany as any).mockResolvedValue([{ userId: "manager-1" }]);

      const form = new FormData();
      form.set("projectId", "p-1");
      form.set("message", "I want to help with docs!");
      const res = await requestToJoinProjectAction(form);
      expect(res).toEqual({ ok: true });
      expect(prisma.projectJoinRequest.upsert).toHaveBeenCalled();
    });
  });
});
