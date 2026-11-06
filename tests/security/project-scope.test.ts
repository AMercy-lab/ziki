import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.hoisted(() => vi.fn());
const lookup = vi.hoisted(() => ({ first: vi.fn(), many: vi.fn(), scope: vi.fn(), session: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { project: { findFirst }, bug: { findFirst: lookup.first, findMany: lookup.many } } }));
vi.mock("react", () => ({ cache: (fn: unknown) => fn }));
vi.mock("@/lib/tenant-viewer", () => ({ viewerBugScope: lookup.scope }));
vi.mock("@/lib/session-user", () => ({ resolveSessionUserId: lookup.session }));

import { AgentProjectError } from "@/lib/agents/require-agent";
import { issueProject } from "@/lib/agent-api/issues";
import { findProjectIssue } from "@/lib/project-issue";

const agent = {
  agentId: "agent1",
  name: "Ada's Claude",
  ownerId: "ada",
  tenantId: "tenant_zedu",
  level: "working" as const,
  burst: false,
  keyId: "key1",
};

describe("shared issue addresses across workspaces", () => {
  const active = { id: "a-issue", number: 482, isDeleted: false, project: { slug: "app", tenant: { slug: "zedu" } } };

  beforeEach(() => {
    lookup.first.mockReset();
    lookup.many.mockReset();
    lookup.scope.mockReset().mockResolvedValue({ tenantId: "a" });
    lookup.session.mockReset().mockResolvedValue({ userId: "u" });
  });

  it("prioritizes the exact shared issue despite a number collision in the active workspace", async () => {
    lookup.first.mockResolvedValueOnce(active).mockResolvedValueOnce({ id: "b-issue" });
    expect(await findProjectIssue("ziki", "app", 482)).toEqual({ kind: "elsewhere", issueId: "b-issue" });
  });

  it("does not redirect an inaccessible link to an unrelated same-numbered issue", async () => {
    lookup.first.mockResolvedValueOnce(active).mockResolvedValueOnce(null);
    expect(await findProjectIssue("private", "app", 482)).toBeNull();
  });

  it("still resolves an issue moved between projects in the same workspace", async () => {
    lookup.first.mockResolvedValueOnce(active).mockResolvedValueOnce(null);
    expect(await findProjectIssue("zedu", "old-app", 482)).toMatchObject({ kind: "moved", issue: { id: "a-issue" } });
  });

  it("returns the original issue after switching and on refresh or new tabs", async () => {
    const target = { ...active, id: "b-issue", project: { slug: "app", tenant: { slug: "ziki" } } };
    lookup.scope.mockResolvedValue({ tenantId: "b" });
    lookup.first.mockResolvedValue(target);
    expect(await findProjectIssue("ziki", "app", 482)).toMatchObject({ kind: "found", issue: { id: "b-issue" } });
  });

  it("preserves the deleted-issue Restore page in the active workspace", async () => {
    const deleted = { ...active, isDeleted: true };
    lookup.first.mockImplementation(async ({ where }) => where.tenantId === "a" && where.isDeleted !== false ? deleted : null);
    expect(await findProjectIssue("zedu", "app", 482)).toMatchObject({ kind: "found", issue: { id: "a-issue", isDeleted: true } });
  });
});

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
