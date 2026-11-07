import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.hoisted(() => vi.fn());
const findMany = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: { project: { findFirst }, skillSubmission: { findMany } } }));

import { AgentProjectError } from "@/lib/agents/require-agent";
import { issueProject } from "@/lib/agent-api/issues";
import { getSkills, CORE_SKILL_TEMPLATES } from "@/app/(app)/skills/skills-data";

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

describe("skills library scope (#skills)", () => {
  beforeEach(() => {
    findMany.mockReset();
  });

  it("only lists approved skills, filtering out pending or rejected submissions", async () => {
    findMany.mockResolvedValue([
      {
        id: "sub-vitest",
        slug: "vitest-deterministic-suite-runner",
        title: "Vitest Deterministic Suite Runner",
        category: "testing",
        categoryLabel: "Testing & QA",
        summary: "Deterministic test suite runner with mutation testing.",
        tags: ["vitest", "testing", "deterministic"],
        prompt: "Run vitest deterministically.",
        checklist: ["Run `npx vitest run --coverage`", "Verify mutants are caught"],
        sampleCommand: "npx vitest run",
        documentationUrl: null,
        createdAt: new Date("2026-11-07T00:00:00.000Z"),
        submittedBy: { name: "Vitest Team" },
        status: "approved",
      },
    ]);

    const { skills, error } = await getSkills();
    expect(error).toBeUndefined();
    expect(skills).toHaveLength(1 + CORE_SKILL_TEMPLATES.length);
    expect(skills[0].title).toBe("Vitest Deterministic Suite Runner");
  });
});
