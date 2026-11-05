import { describe, expect, it } from "vitest";
import { dockVisibleOn, leaderboardVisible } from "@/lib/agents-dock";
import { gettingStartedFor, parseDismissed, withDismissed } from "@/lib/onboarding";
import { NEXT_STEP_COOKIE, workspaceNextStep, type WorkspaceNextStepInput } from "@/lib/workspace-next-step";

/**
 * The agents bar (#agents-dock): which pages draw it, when the Leaderboard
 * link is worth showing, the Getting started agent step, and the one next step
 * a workspace card names in place of the empty bar. Pure rules.
 */

describe("dockVisibleOn: where the agents bar shows", () => {
  it.each([
    "/acme",
    "/acme/ideas",
    "/acme/ideas/drafts",
    "/acme/ideas/rejected",
    "/acme/ideas/7",
    "/acme/issues",
    "/acme/issues/open",
    "/acme/issues/new",
    "/acme/42",
    "/acme/42/history",
    "/acme/workstream",
    "/inbox",
    "/inbox/escalations/abc",
    "/home",
    "/activity",
    "/feed",
  ])("shows on %s when you have agents", (path) => {
    expect(dockVisibleOn(path, 1)).toBe(true);
    expect(dockVisibleOn(path, 3)).toBe(true);
  });

  it.each(["/agents/mine", "/agent/robo", "/agent/robo/edit", "/agent/robo/edit/look"])(
    "hides on the page that manages agents: %s",
    (path) => {
      expect(dockVisibleOn(path, 2)).toBe(false);
    },
  );

  it.each(["/settings/connect", "/settings/agents/connect", "/settings/agents/pair"])(
    "hides while creating or approving an agent: %s",
    (path) => {
      expect(dockVisibleOn(path, 2)).toBe(false);
    },
  );

  it.each([
    "/settings",
    "/settings/profile",
    "/settings/agents",
    "/settings/agent/robo",
    "/projects/acme/settings",
    "/acme/org",
    "/acme/org/members",
    "/acme/org/invites",
    "/superadmin",
    "/superadmin/users",
    "/superadmin/orgs/acme",
    "/tenants",
    "/tenants/invite/abc",
    "/security",
    "/points/disputes",
    "/points/disputes/new",
  ])("hides on settings and admin: %s", (path) => {
    expect(dockVisibleOn(path, 2)).toBe(false);
  });

  it.each(["/docs", "/agents", "/agents/skill/react", "/workers"])("hides on reading pages: %s", (path) => {
    expect(dockVisibleOn(path, 2)).toBe(false);
  });

  it("hides everywhere when you have no agents", () => {
    for (const path of ["/acme", "/acme/issues", "/acme/42", "/acme/workstream", "/inbox", "/home", "/activity", "/feed", "/agents/mine", "/settings", "/docs"]) {
      expect(dockVisibleOn(path, 0)).toBe(false);
    }
  });

  it("matches whole path segments, not prefixes", () => {
    // A project called "organic" or "settings-ui" is not /settings or /org.
    expect(dockVisibleOn("/organic/issues", 1)).toBe(true);
    expect(dockVisibleOn("/settings-ui/issues", 1)).toBe(true);
    expect(dockVisibleOn("/acme/organisation", 1)).toBe(true);
    // A project page named org*: only the second segment "org" is the organization area.
    expect(dockVisibleOn("/acme/issues/org", 1)).toBe(true);
  });

  it("ignores a trailing slash", () => {
    expect(dockVisibleOn("/agents/mine/", 1)).toBe(false);
    expect(dockVisibleOn("/acme/issues/", 1)).toBe(true);
  });

  it("keeps today's behaviour on pages the table does not list", () => {
    // Not named in the table: shown when you have agents, as before.
    expect(dockVisibleOn("/questions", 1)).toBe(true);
    expect(dockVisibleOn("/earn/tasks", 1)).toBe(true);
    expect(dockVisibleOn("/users/abc", 1)).toBe(true);
  });

  it("treats a missing path as nothing to hide", () => {
    expect(dockVisibleOn(null, 1)).toBe(true);
    expect(dockVisibleOn(undefined, 0)).toBe(false);
  });
});

describe("leaderboardVisible: you can't be the only person on a leaderboard", () => {
  it("hides it for a one-member workspace", () => {
    expect(leaderboardVisible(1)).toBe(false);
    expect(leaderboardVisible(0)).toBe(false);
  });

  it("shows it once there is more than one member", () => {
    expect(leaderboardVisible(2)).toBe(true);
    expect(leaderboardVisible(40)).toBe(true);
  });

  it("keeps it when the count could not be loaded", () => {
    expect(leaderboardVisible(null)).toBe(true);
    expect(leaderboardVisible(undefined)).toBe(true);
  });
});

type AgentRow = { tenantId: string; ownerUserId: string; revokedAt: Date | null };

/** A small fake database: the four counts the checklist always reads, and the agents it filters. */
function checklistDb({ agents = [] as AgentRow[], members = 1, projects = 1, issues = 0, invites = 0 } = {}) {
  return {
    project: { count: async () => projects },
    bug: { count: async () => issues },
    membership: { count: async () => members },
    tenantInvite: { count: async () => invites },
    agent: {
      count: async ({ where }: { where: { tenantId: string; ownerUserId: string; revokedAt: null } }) =>
        agents.filter((a) => a.tenantId === where.tenantId && a.ownerUserId === where.ownerUserId && a.revokedAt === where.revokedAt).length,
    },
  } as unknown as Parameters<typeof gettingStartedFor>[0];
}

describe("Getting started: Connect your first agent", () => {
  const mine: AgentRow = { tenantId: "t1", ownerUserId: "owner", revokedAt: null };

  it("adds a 5th step after the four that were there, open until you have an agent", async () => {
    const { steps, complete } = await gettingStartedFor(checklistDb(), "t1", "acme", { userId: "owner" });
    expect(steps.map((step) => step.id)).toEqual(["workspace", "project", "issue", "invite", "agent"]);
    const agent = steps[4]!;
    expect(agent.label).toBe("Connect your first agent");
    expect(agent.href).toBe("/settings/connect");
    expect(agent.done).toBe(false);
    expect(complete).toBe(false);
  });

  it("ticks once you have an agent in this workspace", async () => {
    const { steps } = await gettingStartedFor(checklistDb({ agents: [mine] }), "t1", "acme", { userId: "owner" });
    expect(steps.find((step) => step.id === "agent")?.done).toBe(true);
  });

  it("does not count a revoked agent, someone else's agent or another workspace's", async () => {
    const agents: AgentRow[] = [
      { ...mine, revokedAt: new Date("2026-01-01") },
      { ...mine, ownerUserId: "teammate" },
      { ...mine, tenantId: "t2" },
    ];
    const { steps } = await gettingStartedFor(checklistDb({ agents }), "t1", "acme", { userId: "owner" });
    expect(steps.find((step) => step.id === "agent")?.done).toBe(false);
  });

  it("is complete only when the agent step is done too", async () => {
    const rest = { members: 2, issues: 3 };
    expect((await gettingStartedFor(checklistDb(rest), "t1", "acme", { userId: "owner" })).complete).toBe(false);
    expect((await gettingStartedFor(checklistDb({ ...rest, agents: [mine] }), "t1", "acme", { userId: "owner" })).complete).toBe(true);
  });
});

describe("workspaceNextStep: the one next thing, from who you are", () => {
  const base: WorkspaceNextStepInput = {
    slug: "acme",
    membershipRole: "owner",
    appRole: "user",
    agentCount: 0,
    blockedAgentCount: 0,
    memberCount: 3,
    pendingInvites: 0,
    dismissed: false,
    openChecklistSteps: [],
  };
  const ask = (over: Partial<WorkspaceNextStepInput>) => workspaceNextStep({ ...base, ...over });

  it("tells an owner with no agents to connect one", () => {
    const card = ask({});
    expect(card?.id).toBe("connect-agent");
    expect(card?.message).toBe("Your project is set up. Connect an agent to start filing and fixing issues.");
    expect(card?.cta).toBe("Connect an agent");
    expect(card?.href).toBe("/settings/connect");
  });

  it("tells an admin the same", () => {
    expect(ask({ membershipRole: "admin" })?.id).toBe("connect-agent");
  });

  it("tells a member with no agents to create one and earn", () => {
    const card = ask({ membershipRole: "member" });
    expect(card?.id).toBe("create-agent");
    expect(card?.message).toBe("Earn by fixing issues here. Create an agent and it bids on work for you.");
    expect(card?.cta).toBe("Create an agent");
    expect(card?.href).toBe("/settings/connect");
  });

  it("leaves it to AgentSetupNotice when an agent is blocked: no second card", () => {
    expect(ask({ agentCount: 1, blockedAgentCount: 1, memberCount: 1 })).toBeNull();
    expect(ask({ agentCount: 2, blockedAgentCount: 2, membershipRole: "member" })).toBeNull();
  });

  it("tells the owner of a solo workspace, with agents, to invite a teammate", () => {
    const card = ask({ agentCount: 1, memberCount: 1 });
    expect(card?.id).toBe("invite-teammate");
    expect(card?.message).toBe("Invite a teammate so your agents' work gets reviewed.");
    expect(card?.href).toBe("/acme/org/invites");
  });

  it("says nothing to an owner with agents once the workspace has company or a pending invite", () => {
    expect(ask({ agentCount: 1, memberCount: 2 })).toBeNull();
    expect(ask({ agentCount: 1, memberCount: 1, pendingInvites: 1 })).toBeNull();
  });

  it("says nothing to a member or admin with agents", () => {
    expect(ask({ agentCount: 1, memberCount: 1, membershipRole: "member" })).toBeNull();
    expect(ask({ agentCount: 1, memberCount: 1, membershipRole: "admin" })).toBeNull();
  });

  it("says nothing when you aren't a member of the workspace", () => {
    expect(ask({ membershipRole: null })).toBeNull();
  });

  it("stays away once dismissed", () => {
    expect(ask({ dismissed: true })).toBeNull();
    expect(ask({ dismissed: true, membershipRole: "member" })).toBeNull();
    expect(ask({ dismissed: true, agentCount: 1, memberCount: 1 })).toBeNull();
  });

  it("never repeats a step the Getting started checklist is showing", () => {
    expect(ask({ openChecklistSteps: ["invite", "agent"] })).toBeNull();
    expect(ask({ agentCount: 1, memberCount: 1, openChecklistSteps: ["invite"] })).toBeNull();
    // A step the checklist has ticked is no longer on the page.
    expect(ask({ openChecklistSteps: ["invite"] })?.id).toBe("connect-agent");
    // The member card has no checklist step: members never see the checklist.
    expect(ask({ membershipRole: "member", openChecklistSteps: ["agent"] })?.id).toBe("create-agent");
  });

  it("treats the site super admin as an admin of the workspace, as the checklist does", () => {
    expect(ask({ membershipRole: "member", appRole: "super_admin" })?.id).toBe("connect-agent");
  });
});

describe("the next-step card's dismissal cookie", () => {
  it("is its own cookie, kept per workspace like the checklist's", () => {
    expect(NEXT_STEP_COOKIE).not.toBe("ziki_getting_started_dismissed");
    const once = withDismissed(undefined, "t1");
    const twice = withDismissed(once, "t2");
    expect(parseDismissed(twice)).toEqual(["t1", "t2"]);
    expect(parseDismissed(withDismissed(twice, "t1"))).toEqual(["t2", "t1"]);
  });
});
