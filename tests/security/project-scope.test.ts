import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: { project: { findFirst } } }));

const section = vi.hoisted(() => ({
  notFound: vi.fn(() => { throw new Error("NOT_FOUND"); }),
  redirect: vi.fn((to: string) => { throw new Error(`REDIRECT ${to}`); }),
  requireProject: vi.fn(),
  firstProjectSlugFor: vi.fn(),
  requireUser: vi.fn(async () => ({ id: "ada" })),
}));
vi.mock("next/navigation", () => ({ notFound: section.notFound, redirect: section.redirect }));
vi.mock("@/lib/project-route", () => ({ requireProject: section.requireProject, firstProjectSlugFor: section.firstProjectSlugFor }));
vi.mock("@/lib/auth-helpers", () => ({ requireUser: section.requireUser }));

import MarketingHomePage from "@/app/(app)/[project]/marketing/page";
import MarketingPage from "@/app/(app)/marketing/page";
import { AgentProjectError } from "@/lib/agents/require-agent";
import { marketingTabHref } from "@/lib/header-nav";
import { issueProject } from "@/lib/agent-api/issues";

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

describe("the marketing section", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    section.requireUser.mockResolvedValue({ id: "ada" });
  });

  it("is refused to someone who can't open the project", async () => {
    section.requireProject.mockRejectedValue(new Error("NOT_FOUND"));
    await expect(MarketingHomePage({ params: Promise.resolve({ project: "web" }) })).rejects.toThrow("NOT_FOUND");
    expect(section.requireProject).toHaveBeenCalledWith("web", "/web/marketing");
  });

  it("sends the Marketing tab and /marketing to the project's section, not Amp", async () => {
    expect(marketingTabHref("web")).toBe("/web/marketing");
    expect(marketingTabHref(null)).toBe("/marketing");
    section.firstProjectSlugFor.mockResolvedValue("web");
    await expect(MarketingPage()).rejects.toThrow("REDIRECT /web/marketing");
  });

  it("sends someone with no project to their workspaces", async () => {
    section.firstProjectSlugFor.mockResolvedValue(null);
    await expect(MarketingPage()).rejects.toThrow("REDIRECT /tenants");
  });
});
