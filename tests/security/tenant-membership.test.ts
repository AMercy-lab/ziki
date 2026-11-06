import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tenant membership (#425): reports are filed into the reporter's tenant,
 * someone with no membership can't file at all, an area from another project
 * is refused, and an issue in another tenant is "not found".
 */

vi.mock("@/lib/tenant-context", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/tenant-context")>()),
  currentTenantIdFor: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/notify", () => ({ notifyLater: vi.fn() }));
vi.mock("@/lib/session-user", () => ({ resolveSessionUserId: vi.fn() }));
vi.mock("@/lib/auth-helpers", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/tenant-access", () => ({
  currentTenantAccess: vi.fn(async () => ({
    tenantId: "tenant-zedu",
    tenantName: "Zedu",
    tenantSlug: "zedu",
    membershipRole: "member",
    admin: false,
  })),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    bug: { findUnique: vi.fn(), create: vi.fn() },
    idea: { create: vi.fn() },
    // #project-urls: the form names its project; only one in the reporter's tenant is used.
    project: {
      findFirst: vi.fn(async ({ where }: { where: { id: string; tenantId?: string } }) =>
        where.id === "project-zedu" ? { id: "project-zedu", slug: "zedu", tenantId: "tenant-zedu" } : null),
    },
    projectArea: { findFirst: vi.fn() },
    membership: {
      findUnique: vi.fn(async ({ where }: any) =>
        where?.tenantId_userId?.tenantId === "tenant-zedu" && where?.tenantId_userId?.userId !== "stranger-1" ? { id: "m-1" } : null
      ),
    },
    projectMembership: { findUnique: vi.fn().mockResolvedValue(null) },
    user: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { currentTenantIdFor, NO_TENANT_MESSAGE } from "@/lib/tenant-context";
import { canContributeToProject } from "@/lib/project-permissions";
import { createBugAction, updateBugAction } from "@/app/actions/issues";

const db = prisma as unknown as {
  bug: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  idea: { create: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
  projectArea: { findFirst: ReturnType<typeof vi.fn> };
  $executeRaw: ReturnType<typeof vi.fn>;
};
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
    db.$transaction.mockImplementation(async (run: (tx: unknown) => unknown) => run(prisma));
    (prisma.membership.findUnique as any).mockImplementation(async ({ where }: any) =>
      where?.tenantId_userId?.tenantId === "tenant-zedu" ? { id: "m-1" } : null
    );
    (prisma.projectMembership.findUnique as any).mockResolvedValue(null);
  });

  it("refuses to file a report for someone with no membership", async () => {
    tenantOf.mockResolvedValue(null);
    expect(await createBugAction(report)).toEqual({ error: NO_TENANT_MESSAGE });
    expect(db.idea.create).not.toHaveBeenCalled();
  });

  it("files the report, as an idea, into the reporter's tenant and project", async () => {
    tenantOf.mockResolvedValue("tenant-zedu");
    db.idea.create.mockRejectedValue(new Error("stop after create"));
    await createBugAction(report).catch(() => undefined);
    expect(db.idea.create).toHaveBeenCalledTimes(1);
    expect(db.idea.create.mock.calls[0][0].data).toMatchObject({
      tenantId: "tenant-zedu",
      projectId: "project-zedu",
      beneficiaryUserId: "user-1",
    });
  });

  it("allows direct project members to file issues even without org membership", async () => {
    tenantOf.mockResolvedValue(null);
    (requireUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "external-1", role: "user" });
    (prisma.projectMembership.findUnique as any).mockResolvedValue({ id: "pm-1" });
    (prisma.membership.findUnique as any).mockResolvedValue(null);
    db.idea.create.mockRejectedValue(new Error("stop after create"));

    await createBugAction(report).catch(() => undefined);
    expect(db.idea.create).toHaveBeenCalledTimes(1);
    expect(db.idea.create.mock.calls[0][0].data).toMatchObject({
      tenantId: "tenant-zedu",
      projectId: "project-zedu",
    });
  });

  it("refuses uninvited non-members from submitting issues", async () => {
    tenantOf.mockResolvedValue("tenant-personal");
    (requireUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "stranger-1", role: "user" });
    (prisma.projectMembership.findUnique as any).mockResolvedValue(null);
    (prisma.membership.findUnique as any).mockResolvedValue(null);

    const result = await createBugAction(report);
    expect(result).toEqual({ error: "You must be a member of this project to submit issues." });
    expect(db.idea.create).not.toHaveBeenCalled();
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
    expect(db.idea.create).not.toHaveBeenCalled();
  });

  it("rejects an area from another project before saving", async () => {
    tenantOf.mockResolvedValue("tenant-zedu");
    db.projectArea.findFirst.mockResolvedValue(null);
    const result = await createBugAction(form({
      title: "Login button does nothing",
      description: "Clicking Login on the sign-in page does nothing at all, on Chrome and Firefox.",
      proofLinks: "",
      projectId: "project-zedu",
      areaId: "foreign-area",
    }));
    expect(result).toMatchObject({ error: expect.any(String), field: "areaId" });
    expect(db.idea.create).not.toHaveBeenCalled();
  });

  it("treats an issue in another tenant as not found", async () => {
    tenantOf.mockResolvedValue("tenant-zedu");
    db.bug.findUnique.mockResolvedValue(null);
    expect(await updateBugAction("bug-in-acme", form({ status: "resolved" }))).toEqual({
      error: expect.any(String),
    });
    expect(db.bug.findUnique.mock.calls[0][0].where).toEqual({ id: "bug-in-acme", tenantId: "tenant-zedu" });
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
    (prisma.projectMembership.findUnique as any).mockResolvedValue({ id: "pm-1" });
    const allowed = await canContributeToProject({ id: "user-1", role: "user" }, "p-1", "t-1");
    expect(allowed).toBe(true);
  });

  it("allows organization members", async () => {
    (prisma.projectMembership.findUnique as any).mockResolvedValue(null);
    (prisma.membership.findUnique as any).mockResolvedValue({ id: "m-1" });
    const allowed = await canContributeToProject({ id: "user-1", role: "user" }, "p-1", "t-1");
    expect(allowed).toBe(true);
  });

  it("denies uninvited non-members", async () => {
    (prisma.projectMembership.findUnique as any).mockResolvedValue(null);
    (prisma.membership.findUnique as any).mockResolvedValue(null);
    const allowed = await canContributeToProject({ id: "stranger-1", role: "user" }, "p-1", "t-1");
    expect(allowed).toBe(false);
  });
});
