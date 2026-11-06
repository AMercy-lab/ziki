import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.hoisted(() => vi.fn());
const membershipFindUnique = vi.hoisted(() => vi.fn());
const projectFindUnique = vi.hoisted(() => vi.fn());
const projectMembershipFindUnique = vi.hoisted(() => vi.fn());
const projectJoinRequestFindUnique = vi.hoisted(() => vi.fn());
const projectJoinRequestUpsert = vi.hoisted(() => vi.fn());
const notificationCreateMany = vi.hoisted(() => vi.fn().mockResolvedValue({ count: 1 }));
const membershipFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: { findFirst, findUnique: projectFindUnique },
    membership: { findUnique: membershipFindUnique, findMany: membershipFindMany },
    projectMembership: { findUnique: projectMembershipFindUnique },
    projectJoinRequest: { findUnique: projectJoinRequestFindUnique, upsert: projectJoinRequestUpsert },
    notification: { createMany: notificationCreateMany },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({
  requireUser: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { AgentProjectError } from "@/lib/agents/require-agent";
import { issueProject } from "@/lib/agent-api/issues";
import { canManageProject } from "@/lib/project-permissions";
import { requestToJoinProjectAction } from "@/app/actions/project-join-requests";
import { requireUser } from "@/lib/auth-helpers";

const agent = {
  agentId: "agent1",
  name: "Ada's Claude",
  ownerId: "ada",
  tenantId: "tenant_zedu",
  level: "working" as const,
  burst: false,
  keyId: "key1",
};

describe("issueProject project scope (#742)", () => {
  beforeEach(() => {
    findFirst.mockReset();
    findFirst.mockResolvedValue({ id: "project_web" });
  });

  it("allows a legacy key that is not limited to a project", async () => {
    await expect(issueProject({ ...agent, projectId: null }, new URLSearchParams("projectId=project_web"))).resolves.toEqual({
      tenantId: "tenant_zedu",
      projectId: "project_web",
    });
  });

  it("allows a key limited to that project", async () => {
    await expect(
      issueProject(
        { ...agent, projectId: "project_web", projectSlug: "web" },
        new URLSearchParams("projectId=project_web"),
      ),
    ).resolves.toMatchObject({ projectId: "project_web" });
  });

  it("rejects a key limited to another project", async () => {
    await expect(
      issueProject(
        { ...agent, projectId: "project_mobile", projectSlug: "mobile" },
        new URLSearchParams("projectId=project_web"),
      ),
    ).rejects.toBeInstanceOf(AgentProjectError);
  });
});

describe("project addresses carry the organisation (#project-urls)", () => {
  it("reads an old project-first address as old, and an org/project address as new", async () => {
    const { isProjectFirstPath, issuesPath, projectRef } = await import("@/lib/project-paths");
    expect(isProjectFirstPath("/desktop/ideas/2297")).toBe(true);
    expect(isProjectFirstPath("/desktop/740")).toBe(true);
    expect(isProjectFirstPath("/zedu/desktop/ideas/2297")).toBe(false);
    expect(isProjectFirstPath("/zedu")).toBe(false);
    expect(issuesPath(projectRef("zedu", "desktop"), "in_progress")).toBe("/zedu/desktop/issues/in-progress");
  });

  it("never lets a new project or organisation take a name an address reads as old or as a site page", async () => {
    const { unreservedProjectSlug } = await import("@/lib/project-slug");
    const { tenantSlugCandidate } = await import("@/lib/tenants");
    expect(unreservedProjectSlug("123")).toBe("123-project");
    expect(unreservedProjectSlug("workstream")).toBe("workstream-project");
    expect(tenantSlugCandidate("agents", 0, () => "x2y3")).toBe("agents-x2y3");
    expect(tenantSlugCandidate("zedu", 0)).toBe("zedu");
  });
});

describe("canManageProject permissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows site super_admin", async () => {
    expect(await canManageProject({ id: "admin-1", role: "super_admin" }, "tenant-1")).toBe(true);
  });

  it("allows tenant owners and admins", async () => {
    membershipFindUnique.mockResolvedValue({ role: "owner" });
    expect(await canManageProject({ id: "user-1", role: "user" }, "tenant-1")).toBe(true);

    membershipFindUnique.mockResolvedValue({ role: "admin" });
    expect(await canManageProject({ id: "user-1", role: "user" }, "tenant-1")).toBe(true);
  });

  it("denies regular tenant members and outsiders", async () => {
    membershipFindUnique.mockResolvedValue({ role: "member" });
    expect(await canManageProject({ id: "user-1", role: "user" }, "tenant-1")).toBe(false);

    membershipFindUnique.mockResolvedValue(null);
    expect(await canManageProject({ id: "stranger-1", role: "user" }, "tenant-1")).toBe(false);
  });
});

describe("requestToJoinProjectAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-1", name: "Alice", email: "alice@example.com" });
    projectJoinRequestFindUnique.mockResolvedValue(null);
  });

  it("rejects when user is already a member", async () => {
    findFirst.mockResolvedValue({
      id: "p-1",
      name: "Test Project",
      slug: "test-p",
      tenantId: "t-1",
      isOpenForContributors: true,
      visibility: "public",
      tenant: { slug: "test-org" },
    });
    membershipFindUnique.mockResolvedValue({ id: "m-1" });
    projectMembershipFindUnique.mockResolvedValue(null);

    const form = new FormData();
    form.set("projectId", "p-1");
    const res = await requestToJoinProjectAction(form);
    expect(res).toEqual({ error: "You are already a member of this project." });
  });

  it("rejects when project is closed or private", async () => {
    findFirst.mockResolvedValue({
      id: "p-1",
      name: "Test Project",
      slug: "test-p",
      tenantId: "t-1",
      isOpenForContributors: false,
      visibility: "public",
      tenant: { slug: "test-org" },
    });
    membershipFindUnique.mockResolvedValue(null);
    projectMembershipFindUnique.mockResolvedValue(null);

    const form = new FormData();
    form.set("projectId", "p-1");
    const res = await requestToJoinProjectAction(form);
    expect(res).toEqual({ error: "This project is not currently accepting contributor applications." });
  });

  it("creates join request when project is public and open", async () => {
    findFirst.mockResolvedValue({
      id: "p-1",
      name: "Test Project",
      slug: "test-p",
      tenantId: "t-1",
      isOpenForContributors: true,
      visibility: "public",
      tenant: { slug: "test-org" },
    });
    membershipFindUnique.mockResolvedValue(null);
    projectMembershipFindUnique.mockResolvedValue(null);
    membershipFindMany.mockResolvedValue([{ userId: "manager-1" }]);

    const form = new FormData();
    form.set("projectId", "p-1");
    form.set("message", "I want to help!");
    const res = await requestToJoinProjectAction(form);
    expect(res).toEqual({ ok: true });
    expect(projectJoinRequestUpsert).toHaveBeenCalled();
  });

  it("prevents duplicate spam requests when already pending", async () => {
    findFirst.mockResolvedValue({
      id: "p-1",
      name: "Test Project",
      slug: "test-p",
      tenantId: "t-1",
      isOpenForContributors: true,
      visibility: "public",
      tenant: { slug: "test-org" },
    });
    membershipFindUnique.mockResolvedValue(null);
    projectMembershipFindUnique.mockResolvedValue(null);
    projectJoinRequestFindUnique.mockResolvedValue({ status: "pending", updatedAt: new Date() });

    const form = new FormData();
    form.set("projectId", "p-1");
    const res = await requestToJoinProjectAction(form);
    expect(res).toEqual({ error: "You already have a pending request to join this project." });
  });
});
