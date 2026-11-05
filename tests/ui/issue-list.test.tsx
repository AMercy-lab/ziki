import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";

/** The issue list: the main status tabs and their counts, filters that keep search and scope, rows that link to the issue, and ideas listed apart from issues. */
/**
 * Renders the whole issue list with a small fake database, so the layout
 * changes from the Oct 20 call (#1054–#1063) are checked on real markup.
 */

const count = vi.hoisted(() => vi.fn());
const findMany = vi.hoisted(() => vi.fn());
// #idea-table: ideas come from their own table, on the Ideas tab.
const ideaCount = vi.hoisted(() => vi.fn());
const ideaFindMany = vi.hoisted(() => vi.fn());
// Each idea's votes by opinion, to mark bad ideas red (#idea-rejected).
const ideaVerdictGroupBy = vi.hoisted(() => vi.fn());
const groupBy = vi.hoisted(() => vi.fn(async (_args: { by: string[]; where?: Record<string, unknown> }) => {
  void _args;
  return [];
}));
const indexedSearch = vi.hoisted(() => vi.fn());
vi.mock("@/lib/search-index", () => ({
  searchWorkItems: indexedSearch,
  bugSearchSort: () => "createdAt:desc,sourceId:desc",
  ideaSearchSort: () => "score:desc,createdAt:desc,sourceId:desc",
  typesenseFilter: (field: string, value: unknown) => value === undefined ? null : `${field}:=${String(value)}`,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/acme/issues/all",
  useParams: () => ({ project: "acme" }),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "dave" } })) }));
vi.mock("@/lib/auth-helpers", () => ({ requireUser: vi.fn(async () => ({ id: "dave", role: "user" })) }));
// #project-urls: the slug in the address picks the project and checks access.
vi.mock("@/lib/project-route", () => ({
  requireProject: vi.fn(async () => ({
    user: { id: "dave", role: "user" },
    tenantId: "tenant-acme",
    project: { id: "project-acme", slug: "acme", name: "Acme Web", goal: null, tenantId: "tenant-acme" },
  })),
}));
vi.mock("@/lib/tenant-access", () => ({ currentTenantAccess: vi.fn(async () => ({ membershipRole: "member" })) }));
vi.mock("@/lib/lookups", () => ({
  getIssueTypes: vi.fn(async () => []),
  getPlatforms: vi.fn(async () => [
    { id: "cat-web", name: "Web", isActive: true },
    { id: "cat-mobile", name: "Mobile", isActive: true },
    { id: "cat-old", name: "Desktop", isActive: false },
  ]),
}));
vi.mock("@/lib/tenant-context", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/tenant-context")>()),
  currentTenantIdFor: vi.fn(async () => "tenant-acme"),
}));
vi.mock("@/lib/issue-stage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/issue-stage")>()),
  openIssueConfirmations: vi.fn(async () => new Map([["bug-1", { stage: "confirming", accepts: 1, rejects: 0, needed: 2, confirmed: false }]])),
}));
vi.mock("@/lib/voter-summaries", () => ({
  fetchVoterSummaries: vi.fn(async () =>
    new Map([
      [
        "bug-1",
        {
          likes: { count: 2, voters: [{ id: "a", name: "Ann", image: null }, { id: "b", name: "Ben", image: null }] },
          dislikes: { count: 1, voters: [{ id: "c", name: "Cy", image: null }] },
        },
      ],
    ]),
  ),
}));
vi.mock("@/lib/workflow", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/workflow")>()),
  workflowFor: vi.fn(async () => ({ ...(await import("@/lib/workflow-config")).DEFAULT_PROJECT_WORKFLOW, ideaThreshold: 4 })),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: { findFirst: vi.fn(async () => ({ slug: "acme-web", name: "Acme Web", goal: null })) },
    bug: { count, findMany, groupBy },
    idea: { count: ideaCount, findMany: ideaFindMany },
    ideaVerdict: { groupBy: ideaVerdictGroupBy, findMany: vi.fn(async () => []) },
    milestone: { findMany: vi.fn(async () => []) },
    projectArea: { findMany: vi.fn(async () => []) },
    user: { findUnique: vi.fn(async () => ({ keyboardShortcuts: true })) },
  },
}));

import { IssuesList } from "@/app/(app)/[project]/issues/_list/issues-list";
import { TasksBoard } from "@/components/marketing/tasks/tasks-board";
import { taskTab, type TaskRow, type TasksBoardData } from "@/components/marketing/tasks/model";

const BUG = {
  id: "bug-1",
  number: 7,
  title: "Login button does nothing",
  description: "## Summary\nLogin button does nothing\n\n## Acceptance Criteria\n- [ ] Fix login",
  createdByAgentId: null,
  status: "open",
  substatus: "requires_confirmation",
  voteCount: 2,
  proofLinks: ["https://github.com/acme/web/pull/1", "https://github.com/acme/web/pull/2"],
  isDeleted: false,
  isBoosted: false,
  duplicateOf: null,
  createdAt: new Date("2026-10-01T10:00:00Z"),
  updatedAt: new Date("2026-10-20T10:00:00Z"),
  type: null,
  reporter: { name: "Rita Reporter", role: "user", image: null },
  assignee: { name: "Bob Builder", role: "user", image: null },
  category: { id: "cat-web", name: "Web" },
  area: null,
  project: { slug: "acme" },
  votes: [],
  _count: { comments: 3, attachments: 1 },
};

const IDEA = {
  id: "idea-1",
  number: 12,
  title: "Export activity as CSV",
  score: 2,
  projectId: "project-acme",
  createdAt: new Date("2026-10-02T10:00:00Z"),
  updatedAt: new Date("2026-10-03T10:00:00Z"),
  rejectedAt: null,
  archivedAt: null,
  verdicts: [],
  reporter: { name: "Rita Reporter" },
  category: { name: "Web" },
  _count: { verdicts: 3 },
};

/** Renders `/acme/issues/<status>`, or `/acme/ideas` when no status is given. */
async function renderList({ status = "ideas", ...query }: Record<string, string> = {}) {
  const returnTo = status === "ideas" ? "/acme/ideas" : `/acme/issues/${status}`;
  const page = (await IssuesList({ slug: "acme", status, returnTo, searchParams: Promise.resolve(query) })) as ReactElement;
  return renderToStaticMarkup(page);
}

const clean = (html: string) => html.replace(/<!-- -->/g, "");
/** The stage bar above the panel, and the status list down its left. */
const stages = (html: string) => clean(html).match(/<nav aria-label="Stages"[\s\S]*?<\/nav>/)?.[0] ?? "";
const statusList = (html: string) => clean(html).match(/<nav aria-label="Status"[\s\S]*?<\/nav>/)?.[0] ?? "";
const links = (nav: string) => [...nav.matchAll(/<a [^>]*>[\s\S]*?<\/a>/g)].map((m) => m[0]).filter((link) => !/^<a [^>]*aria-hidden="true"/.test(link));
const labelOf = (link: string) => link.match(/>([A-Za-z][A-Za-z ]*?)(?:<span|<\/a>)/)?.[1] ?? "";
const current = (nav: string) => links(nav).filter((link) => link.includes('aria-current="page"')).map(labelOf);
/** Each link's label and count: beside the label in the stage bar, read out after it in the status list. */
const counted = (nav: string) => Object.fromEntries(links(nav).map((link) => [labelOf(link), Number(link.match(/(\d+)<\/span>/)?.[1])]));

beforeEach(() => {
  vi.clearAllMocks();
  count.mockResolvedValue(1);
  findMany.mockResolvedValue([BUG]);
  ideaCount.mockResolvedValue(4);
  ideaFindMany.mockResolvedValue([IDEA]);
  ideaVerdictGroupBy.mockResolvedValue([]);
  indexedSearch.mockRejectedValue(new Error("Typesense is unavailable in this test."));
});

describe("issue list layout", () => {
  it("links each row to its project address and offers Add Idea", async () => {
    const html = await renderList({ status: "all" });
    expect(html).toContain("Login button does nothing");
    // #project-urls: a row opens the issue at /<project-slug>/<number>.
    expect(html).toContain('href="/acme/7"');
    // Add Idea opens the idea chat box in the toolbar (#idea-chat).
    expect(html).toMatch(/<button[^>]*title="Add Idea"/);
  });

  it("says no issues match when the project has issues but the filters hide them", async () => {
    count.mockImplementation(async (args: { where?: { assigneeId?: unknown } }) => (args?.where?.assigneeId ? 0 : 3));
    findMany.mockResolvedValue([]);
    const html = await renderList({ mine: "assigned", status: "all" });
    expect(html).toMatch(/no issues match/i);
    expect(html).toContain("Clear filters");
    expect(html).not.toMatch(/no issues yet/i);
  });

  it("lists ideas under Ideas' New ideas, from the Idea table, with their score and no importance button (#idea-table)", async () => {
    const html = await renderList();
    expect(ideaFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ tenantId: "tenant-acme", projectId: "project-acme", status: "open", isDeleted: false }),
    }));
    expect(html).toContain('href="/acme/ideas/12"');
    expect(html).toContain("Idea #12");
    expect(html).toMatch(/aria-label="[^"]*idea score 2 of 4"/);
    expect(html).toContain("3 verdicts");
    expect(html).not.toMatch(/click to mark important/);
    // No issue row matches an idea list.
    expect(findMany.mock.calls.at(-1)![0].where.id).toEqual({ in: [] });
  });

  it("keeps search and scope when switching status, and resets paging and intake", async () => {
    const html = await renderList({ q: "login", platform: "cat-web", mine: "assigned", stage: "reported", page: "2", status: "open" });
    const list = statusList(html);
    // #project-urls: the status is the path, the rest stays in the query.
    expect(list).toContain('href="/acme/issues/in-progress?q=login&amp;platform=cat-web&amp;mine=assigned"');
    expect(list).not.toContain("page=");
    expect(list).not.toContain("stage=");
    const statusCount = groupBy.mock.calls.find(([args]) => args?.by?.[0] === "status");
    expect(statusCount?.[0].where).toMatchObject({ tenantId: "tenant-acme", projectId: "project-acme", categoryId: "cat-web" });
    expect(statusCount?.[0].where).not.toHaveProperty("status");
  });

  it("lists both of Open's substatuses on its tab, by the main status (#substatus)", async () => {
    await renderList({ status: "open" });
    const where = findMany.mock.calls.at(-1)![0].where;
    expect(where.status).toBe("open");
    expect(where).not.toHaveProperty("substatus");
  });

  it("searches across every issue on All, so a just-reported issue can be found", async () => {
    const html = await renderList({ q: "login", status: "all" });
    const where = findMany.mock.calls.at(-1)![0].where;
    expect(where).not.toHaveProperty("id");
    expect(where).not.toHaveProperty("status");
    expect(current(stages(html))).toEqual([]);
  });

  it("uses Typesense for issue text hits and rechecks the current tenant-scoped rows in PostgreSQL", async () => {
    indexedSearch.mockResolvedValue({ found: 1, hits: [{ id: "bug-1", kind: "bug", score: 10 }] });
    await renderList({ q: "login", status: "all" });
    expect(indexedSearch).toHaveBeenCalledWith(expect.objectContaining({
      kind: "bug", tenantId: "tenant-acme", projectId: "project-acme", track: "product",
      extraFilters: expect.arrayContaining(["isDeleted:=false"]),
    }));
    const rowQuery = findMany.mock.calls.at(-1)![0];
    expect(rowQuery.where.id).toEqual({ in: ["bug-1"] });
    expect(rowQuery.where).not.toHaveProperty("OR");
    expect(rowQuery.where).toMatchObject({ tenantId: "tenant-acme", projectId: "project-acme", track: "product", isDeleted: false });
  });

  it("uses Typesense for Idea text hits while retaining project and track predicates", async () => {
    ideaCount.mockResolvedValue(1);
    indexedSearch.mockResolvedValue({ found: 1, hits: [{ id: "idea-1", kind: "idea", score: 10 }] });
    await renderList({ q: "export", status: "ideas" });
    expect(indexedSearch).toHaveBeenCalledWith(expect.objectContaining({
      kind: "idea", tenantId: "tenant-acme", projectId: "project-acme", track: "product",
    }));
    const rowQuery = ideaFindMany.mock.calls.at(-1)![0];
    expect(rowQuery.where.id).toEqual({ in: ["idea-1"] });
    expect(rowQuery.where).not.toHaveProperty("OR");
    expect(rowQuery.where).toMatchObject({ tenantId: "tenant-acme", projectId: "project-acme", track: "product", isDeleted: false });
  });

  it("falls back to PostgreSQL for issue text search when Typesense is unavailable", async () => {
    const html = await renderList({ q: "login", status: "all" });
    expect(html).toContain("Issues");
    expect(indexedSearch).toHaveBeenCalled();
    const rowQuery = findMany.mock.calls.at(-1)![0];
    expect(rowQuery.where).toMatchObject({ tenantId: "tenant-acme", projectId: "project-acme", track: "product" });
    expect(rowQuery.where).toHaveProperty("OR");
  });

  it("falls back to PostgreSQL for idea text search and keeps its source-of-truth count", async () => {
    const html = await renderList({ q: "export", status: "ideas" });
    expect(html).toContain("Export activity as CSV");
    expect(indexedSearch).toHaveBeenCalled();
    const rowQuery = ideaFindMany.mock.calls.at(-1)![0];
    expect(rowQuery.where).toMatchObject({ tenantId: "tenant-acme", projectId: "project-acme", track: "product" });
    expect(rowQuery.where).toHaveProperty("OR");
    expect(ideaCount).toHaveBeenCalled();
  });

  it("refills a stale Typesense page from PostgreSQL instead of returning a short page", async () => {
    indexedSearch.mockResolvedValue({ found: 1, hits: [{ id: "deleted-or-missing", kind: "bug", score: 10 }] });
    findMany.mockImplementation(async (args: { where?: Record<string, unknown> }) => args.where?.id ? [] : [BUG]);
    await renderList({ q: "login", status: "all" });
    expect(findMany.mock.calls.at(-1)![0].where).not.toHaveProperty("id");
    expect(findMany.mock.calls.at(-1)![0].where).toHaveProperty("OR");
  });

  it("uses PostgreSQL rows when the indexed total disagrees with the exact database count", async () => {
    indexedSearch.mockResolvedValue({ found: 99, hits: [{ id: "bug-1", kind: "bug", score: 10 }] });
    await renderList({ q: "login", status: "all" });
    expect(findMany.mock.calls.at(-1)![0].where).not.toHaveProperty("id");
    expect(findMany.mock.calls.at(-1)![0].where).toHaveProperty("OR");
  });

  it("lists each tab by its main status (Ziki #713, #substatus)", async () => {
    for (const status of ["in_progress", "done", "merge", "resolved"]) {
      await renderList({ status });
      const where = findMany.mock.calls.at(-1)![0].where;
      expect(where.status).toBe(status);
      expect(where).not.toHaveProperty("AND");
    }
  });

  it("counts each stage as its statuses added up, and each status on the left by itself", async () => {
    groupBy.mockImplementation((async (args: { by: string[] }) =>
      args.by[0] !== "status"
        ? []
        : [
          { status: "open", _count: { _all: 13 } },
          { status: "in_progress", _count: { _all: 2 } },
          { status: "done", _count: { _all: 7 } },
          { status: "merge", _count: { _all: 1 } },
          { status: "resolved", _count: { _all: 7 } },
          { status: "closed", _count: { _all: 3 } },
        ]) as never);
    const html = await renderList({ status: "open" });
    // Ideas: new ideas + rejected ideas. In Progress: Open, In progress, Closed. Delivered: Done, Merge, Live.
    // Possibly delivered is a list inside Open, so In Progress's total doesn't count it again.
    expect(counted(stages(html))).toEqual({ Ideas: 8, "In Progress": 18, Delivered: 15 });
    expect(counted(statusList(html))).toEqual({ Open: 13, "In progress": 2, Closed: 3, "Possibly delivered": 1 });
  });

});

describe("the marketing tasks board", () => {
  const ROW = {
    id: "task-1", number: 41, title: "Write the launch post", href: "/acme/41", status: "open", substatus: "open", closeReason: null,
    importance: 0, reward: 4, rewardEstimates: 2, rewardFixed: false, typeName: "Blog post", agentName: null, work: null, offeredTo: null,
    revision: null, bids: 2, comments: 0, updatedAt: new Date("2026-11-01T10:00:00Z"),
  } satisfies TaskRow;
  
  function renderBoard(board: Partial<TasksBoardData> = {}) {
    return clean(renderToStaticMarkup(
      <TasksBoard slug="acme" board={{
        tab: taskTab("open"),
        counts: { ideas: 2, open: 1, "in-progress": 4, closed: 1, done: 3, live: 2 },
        sortParam: null,
        list: { kind: "tasks", rows: [ROW], sort: "importance" },
        pagination: { page: 1, totalPages: 1, totalCount: 1, from: 1, to: 1 },
        ...board,
      }} />,
    ));
  }

  it("opens each task on the shared issue route, ready for bids with no confirmation step", () => {
    const html = renderBoard();
    expect(html).toContain('href="/acme/41"');
    expect(html).toContain("2 bids");
    expect(html).not.toContain("Awaiting Confirmation");
  });

  it("shows the three stages across the top, each counting its own steps, with Merge left out", () => {
    const nav = stages(renderBoard());
    expect(counted(nav)).toEqual({ Ideas: 2, "In Progress": 6, Delivered: 5 });
    expect(current(nav)).toEqual(["In Progress"]);
  });

  it("lists a stage's lifecycle steps down the left", () => {
    const inProgress = statusList(renderBoard());
    expect(links(inProgress).map(labelOf)).toEqual(["Open", "In progress", "Closed"]);
    expect(current(inProgress)).toEqual(["Open"]);
    const delivered = statusList(renderBoard({ tab: taskTab("live") }));
    expect(links(delivered).map(labelOf)).toEqual(["Done", "Live"]);
    expect(current(delivered)).toEqual(["Live"]);
  });

  it("has no lifecycle steps under Ideas", () => {
    const html = renderBoard({ tab: taskTab("ideas"), list: { kind: "proposals", sort: "score", ideas: [] } });
    expect(statusList(html)).toBe("");
    expect(current(stages(html))).toEqual(["Ideas"]);
  });

  it("lists proposals as ideas, each opening its idea page", () => {
    const html = renderBoard({
      tab: taskTab("ideas"),
      list: { kind: "proposals", sort: "score", ideas: [{
        id: "idea-1", number: 12, title: "A launch post", score: 2, threshold: 3, createdAt: new Date("2026-11-01T10:00:00Z"),
        reporterName: "Rita", platform: null, verdicts: 2, good: 3, badVotes: 1,
      }] },
    });
    expect(html).toContain('href="/acme/ideas/12"');
  });

  it("says why a tab is empty instead of showing an empty list", () => {
    expect(renderBoard({ list: { kind: "tasks", rows: [], sort: "importance" }, pagination: { page: 1, totalPages: 1, totalCount: 0, from: 0, to: 0 } })).toContain("No open tasks.");
  });

  it("keeps the tab and sort when paging", () => {
    const html = renderBoard({ sortParam: "reward", pagination: { page: 1, totalPages: 2, totalCount: 30, from: 1, to: 25 } }).replaceAll("&amp;", "&");
    expect(html).toContain("/acme/marketing?status=open&sort=reward&page=2");
  });
});

describe("the issue list's track filter (M-UI-8)", () => {
  it("lists, and searches, only marketing issues when asked", async () => {
    indexedSearch.mockResolvedValue({ found: 1, hits: [{ id: "bug-1", kind: "bug", score: 10 }] });
    await renderList({ q: "launch", status: "all", track: "marketing" });
    expect(indexedSearch).toHaveBeenCalledWith(expect.objectContaining({ kind: "bug", track: "marketing" }));
    // The first query lists the rows; a later one only reads their descriptions by id.
    expect(findMany.mock.calls[0]![0].where.track).toBe("marketing");
  });

  it("names no track when asked for all work", async () => {
    indexedSearch.mockResolvedValue({ found: 1, hits: [{ id: "bug-1", kind: "bug", score: 10 }] });
    await renderList({ q: "launch", status: "all", track: "all" });
    expect(indexedSearch.mock.calls.at(-1)![0]).not.toHaveProperty("track");
    expect(findMany.mock.calls[0]![0].where.tenantId).toBe("tenant-acme");
    expect(findMany.mock.calls[0]![0].where).not.toHaveProperty("track");
  });
});

describe("keeping marketing work out of the product list", () => {
  it("lists and counts only product issues", async () => {
    await renderList({ status: "open" });
    expect(findMany.mock.calls.at(-1)![0].where.track).toBe("product");
    const statusTabs = groupBy.mock.calls.find(([args]) => args.by.includes("status"));
    expect(statusTabs![0].where).toMatchObject({ track: "product" });
  });

  it("lists and counts only product ideas", async () => {
    await renderList();
    expect(ideaFindMany.mock.calls.at(-1)![0].where.track).toBe("product");
    expect(ideaCount.mock.calls.at(-1)![0].where.track).toBe("product");
  });
});
