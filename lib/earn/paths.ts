import { EARN_PROJECT_SLUG } from "@/lib/earn/draft";

/** Connecting an agent from earn (/earn/agent): a page of its own, with no site header or bar. */
export function isEarnConnectPath(pathname: string | null | undefined): boolean {
  return pathname === "/earn/agent" || pathname === "/earn/agent/";
}

/**
 * Earn (#earn-drafts, Mark's call of 5 Nov): on the earn pages an earner sees only what they came for, so the
 * builders' links (Your App, Marketing, Security) and the leaderboard and workstream icons are left out there.
 * Everyone else, and the earner on any other page, sees the site as it always is.
 */
export function isEarnPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname === "/earn" || pathname.startsWith("/earn/") || pathname.startsWith(`/${EARN_PROJECT_SLUG}/`);
}
