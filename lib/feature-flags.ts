/** Simple feature-flag helpers for server and client code.
 * Feature flags are read from NEXT_PUBLIC_* (for client) or plain env vars for server.
 * The Agent Platform is enabled by default unless explicitly disabled with "false".
 */
export function isAgentPlatformEnabled(): boolean {
  const publicFlag = process.env.NEXT_PUBLIC_AGENT_PLATFORM;
  const serverFlag = process.env.AGENT_PLATFORM;
  if (typeof publicFlag === "string") return publicFlag.toLowerCase() !== "false";
  if (typeof serverFlag === "string") return serverFlag.toLowerCase() !== "false";
  return true;
}

export const AGENT_PLATFORM_FLAG = "AGENT_PLATFORM";

/**
 * Each project's Marketing section (docs/marketing-migration-plan.md, F5). Set
 * `MARKETING_SECTION` to "true" or "false"; unset, it is off in production and
 * on everywhere else. Server only: pages read it per request and pass the result
 * down, so turning it on takes a restart, not a rebuild.
 */
export function isMarketingSectionEnabled(): boolean {
  const flag = process.env.MARKETING_SECTION?.trim().toLowerCase();
  if (flag === "true") return true;
  if (flag === "false") return false;
  return process.env.NODE_ENV !== "production";
}
