import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

import MarketingPage from "@/app/(app)/marketing/page";
import { AgentProjectError } from "@/lib/agents/require-agent";
import { isMarketingSectionEnabled } from "@/lib/feature-flags";
import { AMP_URL, marketingTabHref } from "@/lib/header-nav";
import { requireMarketingProject } from "@/lib/marketing/section";
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
  afterEach(() => vi.unstubAllEnvs());

  it("is off in production and on elsewhere until the flag says otherwise", () => {
    vi.stubEnv("MARKETING_SECTION", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(isMarketingSectionEnabled()).toBe(false);
    vi.stubEnv("MARKETING_SECTION", "true");
    expect(isMarketingSectionEnabled()).toBe(true);

    vi.stubEnv("MARKETING_SECTION", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(isMarketingSectionEnabled()).toBe(true);
    vi.stubEnv("MARKETING_SECTION", "false");
    expect(isMarketingSectionEnabled()).toBe(false);
  });

  describe("while it is off", () => {
    beforeEach(() => vi.stubEnv("MARKETING_SECTION", "false"));

    it("doesn't exist for anyone, members included", async () => {
      await expect(requireMarketingProject("web", "/web/marketing/tasks")).rejects.toThrow("NOT_FOUND");
      expect(section.requireProject).not.toHaveBeenCalled();
    });

    it("keeps the Marketing tab and /marketing on Amp", async () => {
      expect(marketingTabHref(false, "web")).toBe(AMP_URL);
      await expect(MarketingPage()).rejects.toThrow(`REDIRECT ${AMP_URL}`);
    });
  });

  describe("while it is on", () => {
    beforeEach(() => vi.stubEnv("MARKETING_SECTION", "true"));

    it("is refused to someone who can't open the project", async () => {
      section.requireProject.mockRejectedValue(new Error("NOT_FOUND"));
      await expect(requireMarketingProject("web", "/web/marketing/tasks")).rejects.toThrow("NOT_FOUND");
      expect(section.requireProject).toHaveBeenCalledWith("web", "/web/marketing/tasks");
    });

    it("sends the Marketing tab and /marketing to the project's section", async () => {
      expect(marketingTabHref(true, "web")).toBe("/web/marketing");
      expect(marketingTabHref(true, null)).toBe("/marketing");
      section.firstProjectSlugFor.mockResolvedValue("web");
      await expect(MarketingPage()).rejects.toThrow("REDIRECT /web/marketing");
    });

    it("sends someone with no project to their workspaces", async () => {
      section.firstProjectSlugFor.mockResolvedValue(null);
      await expect(MarketingPage()).rejects.toThrow("REDIRECT /tenants");
    });
  });
});
