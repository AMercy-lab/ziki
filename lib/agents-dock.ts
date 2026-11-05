import { isReservedProjectSlug } from "@/lib/project-slug";

/** The agents strip's height (#agents-dock); the page keeps this much free at its foot. */
export const AGENTS_DOCK_HEIGHT = 76;

/**
 * Pages whose first path segment hides the bar: managing agents, creating or
 * approving one, settings and admin, and the reading pages. Matched on whole
 * segments, so a project called "organic" is not "/org".
 */
const HIDDEN_ROOTS: ReadonlySet<string> = new Set([
  // Managing agents: the page already lists them.
  "agent",
  // The agents directory, My agents (/agents/mine) and a skill's agents.
  "agents",
  // Settings, which holds the connect and pair flows (/settings/connect, /settings/agents/connect, /settings/agents/pair).
  "settings",
  // Admin.
  "superadmin",
  "tenants",
  "security",
  // Reading: nothing for your agents to do.
  "docs",
  "workers",
]);

/**
 * Whether the agents bar is drawn on this page (#agents-dock).
 *
 * The bar is there to watch your agents work, so it shows where that happens
 * (a project's ideas, issues and workstream, the inbox, home, activity and the
 * feed) and only when you have agents. Settings, admin, the pages that manage
 * or create agents, and the reading pages hide it. Pages the rules don't name
 * keep drawing it when you have agents, as before.
 */
export function dockVisibleOn(pathname: string | null | undefined, agentCount: number): boolean {
  if (agentCount <= 0) return false;
  const segments = (pathname ?? "").split("/").filter(Boolean);
  const [first, second, third] = segments;
  if (!first) return true;
  if (HIDDEN_ROOTS.has(first)) return false;
  // Disputes sit under /points; /points itself is not named.
  if (first === "points" && second === "disputes") return false;
  // A project's settings: /projects/<slug>/settings.
  if (first === "projects" && third === "settings") return false;
  // A project's organization area: /<project>/org and below.
  if (second === "org" && !isReservedProjectSlug(first)) return false;
  return true;
}

/**
 * Whether to show the Leaderboard link: "you can't be the only person on a
 * leaderboard", so not in a workspace of one member. When the count couldn't
 * be loaded the link stays, as it always was.
 */
export function leaderboardVisible(memberCount: number | null | undefined): boolean {
  return memberCount == null || memberCount > 1;
}
