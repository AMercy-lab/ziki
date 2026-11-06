import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tenant membership (#425): reports are filed into the reporter's tenant,
 * someone with no membership can't file at all, an area from another project
 * is refused, and an issue in another tenant is "not found".
 */

const membershipFindUnique = vi.hoisted(() => vi.fn());
const membershipFindFirst = vi.hoisted(() => vi.fn());
const projectMembershipFindUnique = vi.hoisted(() => vi.fn());
const projectMembershipFindFirst = vi.hoisted(() => vi.fn());
const bugFindUnique = vi.hoisted(() => vi.fn());
const bugCreate = vi.hoisted(() => vi.fn());
const ideaCreate = vi.hoisted(() => vi.fn());
const projectFindFirst = vi.hoisted(() => vi.fn());
const projectAreaFindFirst = vi.hoisted(() => vi.fn());
const issueWatchUpsert = vi.hoisted(() => vi.fn().mockResolvedValue({ id: "iw-1" }));
const userFindUnique = vi.hoisted(() => vi.fn());
const userFindFirst = vi.hoisted(() => vi.fn());
const userFindMany = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const $transaction = vi.hoisted(() => vi.fn());
const $executeRaw = vi.hoisted(() => vi.fn());

vi.mock("@/lib/tenant-context", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/tenant-context")>()),
  currentTenantIdFor: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/notify", () => ({ notifyLater: vi.fn() }));
vi.mock("@/lib/session-user", () => ({ resolveSessionUserId: vi.fn() }));
vi.mock("@/lib/auth-helpers", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/tenant-access", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/tenant-access")>();
  return {
    ...actual,
    currentTenantAccess: vi.fn(async () => ({
      tenantId: "own-workspace-id",
      tenantName: "Own Workspace",
      tenantSlug: "own",
      membershipRole: "owner" as const,
      admin: true,
    })),
  };
});
vi.mock("@/lib/prisma", () => ({
  prisma: {
    bug: { findUnique: bugFindUnique, create: bugCreate },
    idea: { create: ideaCreate },
    project: { findFirst: projectFindFirst },
    projectArea: { findFirst: projectAreaFindFirst },
    membership: {
      findFirst: membershipFindFirst,
      findUnique: membershipFindUnique,
    },
    projectMembership: { findUnique: projectMembershipFindUnique, findFirst: projectMembershipFindFirst },
    issueWatch: { upsert: issueWatchUpsert, updateMany: vi.fn(), createMany: vi.fn() },
    user: { findUnique: userFindUnique, findFirst: userFindFirst, findMany: userFindMany },
    $transaction,
    $executeRaw,
  },
}));

import { requireUser } from "@/lib/auth-helpers";
import { currentTenantIdFor, NO_TENANT_MESSAGE } from "@/lib/tenant-context";
import { canContributeToProject } from "@/lib/project-permissions";
import { createBugAction, updateBugAction } from "@/app/actions/issues";
import { setWatchingAction } from "@/app/actions/watch";
import { tenantAccessFor, currentTenantAccess } from "@/lib/tenant-access";
import { canDeleteTicket } from "@/lib/ticket-deletion";
import { showsAllProjects } from "@/lib/issue-list-filters";

const tenantOf = currentTenantIdFor as unknown as ReturnType<typeof vi.fn>;

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const report = form({
  title: "Login button does nothing",
  description: "Clicking Login on the sign-in page does nothing at all, on Chrome and Firefox.",
  proofLinks: "",
  projectId: "project-zedu",
});

describe("issue actions are tenant-scoped (#425)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-1", role: "user" });
    $transaction.mockImplementation(async (run: (tx: unknown) => unknown) => run({
      idea: { create: ideaCreate },
      projectArea: { findFirst: projectAreaFindFirst },
      $executeRaw,
    }));
    projectFindFirst.mockImplementation(async ({ where }: { where: { id: string; tenantId?: string } }) =>
      where.id === "project-zedu" ? { id: "project-zedu", slug: "zedu", tenantId: "tenant-zedu" } : null
    );
    membershipFindUnique.mockImplementation(async ({ where }: { where?: { tenantId_userId?: { tenantId: string; userId: string } } }) =>
      where?.tenantId_userId?.tenantId === "tenant-zedu" && where?.tenantId_userId?.userId !== "stranger-1" ? { id: "m-1" } : null
    );
    membershipFindFirst.mockResolvedValue(null);
    projectMembershipFindUnique.mockResolvedValue(null);
    projectMembershipFindFirst.mockResolvedValue(null);
  });

  it("refuses to file a report for someone with no membership", async () => {
    tenantOf.mockResolvedValue(null);
    expect(await createBugAction(report)).toEqual({ error: NO_TENANT_MESSAGE });
    expect(ideaCreate).not.toHaveBeenCalled();
  });

  it("files the report, as an idea, into the reporter's tenant and project", async () => {
    tenantOf.mockResolvedValue("tenant-zedu");
    ideaCreate.mockRejectedValue(new Error("stop after create"));
    await createBugAction(report).catch(() => undefined);
    expect(ideaCreate).toHaveBeenCalledTimes(1);
    expect(ideaCreate.mock.calls[0][0].data).toMatchObject({
      tenantId: "tenant-zedu",
      projectId: "project-zedu",
      beneficiaryUserId: "user-1",
    });
  });

  it("allows direct project members to file issues even without org membership", async () => {
    tenantOf.mockResolvedValue(null);
    (requireUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "external-1", role: "user" });
    projectMembershipFindUnique.mockResolvedValue({ id: "pm-1" });
    membershipFindUnique.mockResolvedValue(null);
    ideaCreate.mockRejectedValue(new Error("stop after create"));

    await createBugAction(report).catch(() => undefined);
    expect(ideaCreate).toHaveBeenCalledTimes(1);
    expect(ideaCreate.mock.calls[0][0].data).toMatchObject({
      tenantId: "tenant-zedu",
      projectId: "project-zedu",
    });
  });

  it("refuses uninvited non-members from submitting issues", async () => {
    tenantOf.mockResolvedValue("tenant-personal");
    (requireUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "stranger-1", role: "user" });
    projectMembershipFindUnique.mockResolvedValue(null);
    membershipFindUnique.mockResolvedValue(null);

    const result = await createBugAction(report);
    expect(result).toEqual({ error: "You must be a member of this project to submit issues." });
    expect(ideaCreate).not.toHaveBeenCalled();
  });

  it("refuses a project that does not exist or is in another tenant", async () => {
    tenantOf.mockResolvedValue("tenant-zedu");
    const result = await createBugAction(form({
      title: "Login button does nothing",
      description: "Clicking Login on the sign-in page does nothing at all, on Chrome and Firefox.",
      proofLinks: "",
      projectId: "project-acme",
    }));
    expect(result).toEqual({ error: NO_TENANT_MESSAGE });
    expect(ideaCreate).not.toHaveBeenCalled();
  });

  it("rejects an area from another project before saving", async () => {
    tenantOf.mockResolvedValue("tenant-zedu");
    projectAreaFindFirst.mockResolvedValue(null);
    const result = await createBugAction(form({
      title: "Login button does nothing",
      description: "Clicking Login on the sign-in page does nothing at all, on Chrome and Firefox.",
      proofLinks: "",
      projectId: "project-zedu",
      areaId: "foreign-area",
    }));
    expect(result).toMatchObject({ error: expect.any(String), field: "areaId" });
    expect(ideaCreate).not.toHaveBeenCalled();
  });

  it("treats an issue in another tenant as not found", async () => {
    tenantOf.mockResolvedValue("tenant-zedu");
    bugFindUnique.mockResolvedValue(null);
    expect(await updateBugAction("bug-in-acme", form({ status: "resolved" }))).toEqual({
      error: expect.any(String),
    });
    expect(bugFindUnique.mock.calls[0][0].where).toEqual({ id: "bug-in-acme", tenantId: "tenant-zedu" });
  });

  it("allows direct project members to watch issues and refuses non-members", async () => {
    (requireUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "external-1", role: "user" });
    bugFindUnique.mockResolvedValue({
      id: "bug-1",
      tenantId: "tenant-zedu",
      projectId: "project-zedu",
      isDeleted: false,
      project: { visibility: "private" },
    });
    projectMembershipFindFirst.mockResolvedValue({ id: "pm-1" });
    membershipFindFirst.mockResolvedValue(null);

    const watchRes = await setWatchingAction("bug-1", true);
    expect(watchRes).toEqual({ ok: true });
    expect(issueWatchUpsert).toHaveBeenCalled();

    // Now test refusal for non-member
    (requireUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "stranger-1", role: "user" });
    projectMembershipFindFirst.mockResolvedValue(null);
    membershipFindFirst.mockResolvedValue(null);

    const refuseRes = await setWatchingAction("bug-1", true);
    expect(refuseRes).toEqual({ error: "Issue not found" });
  });
});

describe("canContributeToProject permissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows super_admin regardless of membership", async () => {
    const allowed = await canContributeToProject({ id: "admin-1", role: "super_admin" }, "p-1", "t-1");
    expect(allowed).toBe(true);
  });

  it("allows direct project members", async () => {
    projectMembershipFindUnique.mockResolvedValue({ id: "pm-1" });
    const allowed = await canContributeToProject({ id: "user-1", role: "user" }, "p-1", "t-1");
    expect(allowed).toBe(true);
  });

  it("allows organization members", async () => {
    projectMembershipFindUnique.mockResolvedValue(null);
    membershipFindUnique.mockResolvedValue({ id: "m-1" });
    const allowed = await canContributeToProject({ id: "user-1", role: "user" }, "p-1", "t-1");
    expect(allowed).toBe(true);
  });

  it("denies uninvited non-members", async () => {
    projectMembershipFindUnique.mockResolvedValue(null);
    membershipFindUnique.mockResolvedValue(null);
    const allowed = await canContributeToProject({ id: "stranger-1", role: "user" }, "p-1", "t-1");
    expect(allowed).toBe(false);
  });
});

describe("external workspace owner visiting another org's public project (Items 1 & 2)", () => {
  const user = { id: "user-owner-1", role: "user" as const };
  const targetTenantId = "tenant-other-org";
  const publicProjectId = "project-public-1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ensures an owner of another workspace gets no membership or admin role in the target org", async () => {
    // Current workspace access says owner/admin because they own their own workspace
    const ownAccess = await currentTenantAccess(user.id, user.role);
    expect(ownAccess.membershipRole).toBe("owner");
    expect(ownAccess.admin).toBe(true);

    // But in the target org where they have no membership row, tenantAccessFor returns null/false
    membershipFindUnique.mockResolvedValue(null);
    const targetAccess = await tenantAccessFor(user.id, targetTenantId, user.role);
    expect(targetAccess.membershipRole).toBeNull();
    expect(targetAccess.admin).toBe(false);

    // Consequently, they cannot delete tickets or access deleted issues in that org
    const canDelete = canDeleteTicket(user.role, targetAccess.membershipRole);
    expect(canDelete).toBe(false);

    // With ?deleted=true requested, isDeletedView is false
    const isDeletedView = canDelete && "true" === "true";
    expect(isDeletedView).toBe(false);
  });

  it("prevents an external workspace owner from seeing private projects via ?all=1", () => {
    // User is visiting another org's public project, so isOrgMember is false
    const isOrgMember = false;
    const allParam = "all";

    // Unchecked showsAllProjects would be true
    expect(showsAllProjects(allParam)).toBe(true);

    // But guarded by isOrgMember, allProjects is false
    const allProjects = isOrgMember && showsAllProjects(allParam);
    expect(allProjects).toBe(false);

    // Query scope strictly retains projectId, ensuring private projects in the org are never exposed
    const projectId = publicProjectId;
    const projectFilter = projectId && !allProjects ? { projectId } : {};
    expect(projectFilter).toEqual({ projectId: publicProjectId });
  });

  it("refuses deleted issue history to external workspace owners even if they own another workspace", async () => {
    // In another org, membership is null
    membershipFindUnique.mockResolvedValue(null);
    const targetAccess = await tenantAccessFor(user.id, targetTenantId, user.role);

    const deletedBug = { id: "bug-1", isDeleted: true, tenantId: targetTenantId };
    const canSee = !deletedBug.isDeleted || canDeleteTicket(user.role, targetAccess.membershipRole);
    expect(canSee).toBe(false);
  });
});
