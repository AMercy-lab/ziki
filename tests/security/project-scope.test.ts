import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.hoisted(() => vi.fn());
const publishedTasks = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: { project: { findFirst }, bug: { findMany: publishedTasks } } }));

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
import IdeaBoxPage from "@/app/(app)/[project]/marketing/idea-box/page";
import { readIdeaBox } from "@/app/(app)/[project]/marketing/idea-box/data";
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

describe("Idea Box project isolation", () => {
  it("refuses access before reading published deliverables", async () => {
    section.requireProject.mockRejectedValue(new Error("NOT_FOUND"));
    publishedTasks.mockClear();
    await expect(IdeaBoxPage({ params: Promise.resolve({ project: "private" }) })).rejects.toThrow("NOT_FOUND");
    expect(publishedTasks).not.toHaveBeenCalled();
  });

  it("returns only published marketing work in the authorized tenant and project, with the latest delivery", async () => {
    const approved = {
      id: "approved", number: 42, title: "Launch campaign", projectId: "project_web", tenantId: "tenant_zedu",
      track: "marketing", status: "resolved", substatus: "published", isDeleted: false,
      deliveries: [
        { id: "new", updatedAt: new Date("2026-11-03"), summary: "Approved version", deliverableUrls: ["https://example.com/final.png"], agent: { name: "Studio" } },
        { id: "old", updatedAt: new Date("2026-11-01"), summary: "Earlier version", deliverableUrls: ["https://example.com/draft.png"], agent: { name: "Earlier agent" } },
      ],
      mergeReviews: [{ updatedAt: new Date("2026-11-04") }],
      attachments: [{ id: "evidence", filename: "unrelated-evidence.png", contentType: "image/png", size: 20 }],
    };
    const records = [approved,
      { ...approved, id: "other-project", projectId: "project_other" },
      { ...approved, id: "other-tenant", tenantId: "tenant_other" },
      { ...approved, id: "product", track: "product" },
      { ...approved, id: "unpublished", status: "done", substatus: "accepted" },
      { ...approved, id: "deleted", isDeleted: true },
    ];
    publishedTasks.mockImplementation(async ({ where, select }) => records
      .filter((row) => Object.entries(where).every(([key, value]) => row[key as keyof typeof row] === value))
      .map((row) => ({ ...row, deliveries: select.deliveries.orderBy[0].updatedAt === "desc" ? [...row.deliveries].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, select.deliveries.take) : row.deliveries })));
    const result = await readIdeaBox({ tenantId: "tenant_zedu", project: { id: "project_web" } } as Parameters<typeof readIdeaBox>[0]);
    expect(result).toEqual([expect.objectContaining({
      id: "approved", agent: "Studio", publishedAt: "2026-11-04T00:00:00.000Z",
      files: [expect.objectContaining({ url: "https://example.com/final.png" })],
    })]);
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
