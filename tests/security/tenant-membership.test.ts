import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/tenants", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/tenants")>()),
  setActiveTenantCookie: vi.fn(),
}));
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
    bug: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    idea: { create: vi.fn() },
    // #project-urls: the form names its project; only one in the reporter's tenant is used.
    project: {
      findFirst: vi.fn(async ({ where }: { where: { id: string; tenantId: string } }) =>
        where.id === "project-zedu" && where.tenantId === "tenant-zedu" ? { id: "project-zedu", slug: "zedu" } : null),
    },
    projectArea: { findFirst: vi.fn() },
    user: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { currentTenantIdFor, NO_TENANT_MESSAGE } from "@/lib/tenant-context";
import { createBugAction, updateBugAction } from "@/app/actions/issues";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { setActiveTenantCookie } from "@/lib/tenants";
import { resetRateLimits } from "@/lib/rate-limit";
import { issueSwitchDestination } from "@/lib/issue-switch-destination";
import { resolveIssueWorkspaceSwitch } from "@/lib/issue-workspace-switch";
import { issueTenantHintFor } from "@/lib/issue-tenant-hint";
import { switchIssueWorkspaceAction } from "@/app/(app)/tenants/issue-switch-action";

const db = prisma as unknown as {
  bug: { findUnique: ReturnType<typeof vi.fn>; findFirst: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  idea: { create: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
  projectArea: { findFirst: ReturnType<typeof vi.fn> };
  $executeRaw: ReturnType<typeof vi.fn>;
};
const tenantOf = currentTenantIdFor as unknown as ReturnType<typeof vi.fn>;

const sharedIssuePath = "/ziki/app/482";
const switchForm = () => form({
  issueId: "issue",
  tenantId: "b",
  returnTo: `${sharedIssuePath}?comment=c42#comment-c42`,
});

describe("switching to a shared issue's workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("RATE_LIMIT_STORE", "memory");
    resetRateLimits();
    vi.mocked(auth).mockResolvedValue({ user: { id: "u" } } as never);
    vi.mocked(requireUser).mockResolvedValue({ id: "u" } as never);
    vi.mocked(setActiveTenantCookie).mockReset();
    db.bug.findFirst.mockReset().mockResolvedValue({
      tenantId: "b", number: 482, project: { slug: "app", tenant: { slug: "ziki" } },
    });
    vi.mocked(redirect).mockImplementation((url) => { throw new Error(`redirect:${url}`); });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("verifies access before changing workspace and opens the exact issue, query and anchor", async () => {
    await expect(switchIssueWorkspaceAction({}, switchForm())).rejects.toThrow(`redirect:${sharedIssuePath}?comment=c42#comment-c42`);
    expect(db.bug.findFirst.mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(setActiveTenantCookie).mock.invocationCallOrder[0]);
    expect(setActiveTenantCookie).toHaveBeenCalledWith("b");
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("retains the original issue through expired-session login without changing workspace", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    await expect(switchIssueWorkspaceAction({}, switchForm())).rejects.toThrow("redirect:/login?callbackUrl=%2Fziki%2Fapp%2F482%3Fcomment%3Dc42%23comment-c42");
    expect(setActiveTenantCookie).not.toHaveBeenCalled();
    expect(db.bug.findFirst).not.toHaveBeenCalled();
  });

  it("leaves the workspace unchanged when the issue or access is no longer available", async () => {
    db.bug.findFirst.mockResolvedValue(null);
    expect(await switchIssueWorkspaceAction({}, switchForm())).toHaveProperty("error");
    expect(setActiveTenantCookie).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("returns a retryable error without redirecting when cookie storage fails", async () => {
    vi.mocked(setActiveTenantCookie).mockRejectedValue(new Error("storage unavailable"));
    expect(await switchIssueWorkspaceAction({}, switchForm())).toEqual({ error: "We couldn't switch workspaces. Please try again." });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("rate limits repeated attempts before another access lookup or cookie change", async () => {
    db.bug.findFirst.mockResolvedValue(null);
    for (let attempt = 0; attempt < 20; attempt += 1) await switchIssueWorkspaceAction({}, switchForm());
    db.bug.findFirst.mockClear();
    expect(await switchIssueWorkspaceAction({}, switchForm())).toMatchObject({ error: expect.stringContaining("Too many attempts") });
    expect(db.bug.findFirst).not.toHaveBeenCalled();
    expect(setActiveTenantCookie).not.toHaveBeenCalled();
  });

  it.each(["https://evil.test", "//evil.test", "/\\evil.test", "/login", "/projects/app/open?next=/ziki/app/482", "/zedu/app/482", "/ziki/app/483", "/ziki/app/482\n", null])("rejects an unsafe or different destination: %s", (value) => {
    expect(issueSwitchDestination(sharedIssuePath, value)).toBe(sharedIssuePath);
  });

  it("retains the original issue query and comment anchor", () => {
    const destination = `${sharedIssuePath}?comment=c42&view=all#comment-c42`;
    expect(issueSwitchDestination(sharedIssuePath, destination)).toBe(destination);
  });

  it.each([{ issueId: "", tenantId: "b" }, { issueId: "issue", tenantId: "" }, { issueId: "x".repeat(192), tenantId: "b" }])("rejects malformed identifiers before querying: %j", async (input) => {
    expect(await resolveIssueWorkspaceSwitch(prisma, "u", input)).toBeNull();
    expect(db.bug.findFirst).not.toHaveBeenCalled();
  });

  it("reveals preview data only after an active membership check", async () => {
    const membership = vi.fn().mockResolvedValue(null);
    const hints = {
      bug: { findUnique: vi.fn().mockResolvedValue({ tenantId: "b", number: 482, title: "Private", substatus: "open", project: { name: "App" } }) },
      membership: { findFirst: membership },
    } as unknown as Parameters<typeof issueTenantHintFor>[0];
    expect(await issueTenantHintFor(hints, { userId: "u", activeTenantId: "a", issueId: "issue" })).toBeNull();
    membership.mockResolvedValue({ tenant: { id: "b", name: "Ziki", slug: "ziki" } });
    expect(await issueTenantHintFor(hints, { userId: "u", activeTenantId: "a", issueId: "issue" })).toMatchObject({ name: "Ziki", issue: { number: 482, title: "Private", projectName: "App" } });
  });
});

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

  it("refuses a project from another tenant", async () => {
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
