import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { currentOrganisationIdFor } from "@/lib/organisation-context";
import { projectContextFor } from "@/lib/project-context";
import { isAgentPlatformEnabled } from "@/lib/feature-flags";
import { ConnectAgentFlow } from "@/app/(app)/settings/agents/connect/connect-agent-flow";
import {
  agentsLink,
  agentsMutedClass,
  agentsPrimaryBtn,
  agentsSurface,
} from "@/app/(app)/settings/agents/agents-ui";

export const metadata = { title: "Connect your agent" };

/**
 * Connect your agent: one button. It names the agent, hands over one piece of
 * text to paste into it, and shows when the agent has connected.
 */
export default async function ConnectAgentPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string | string[]; from?: string | string[] }>;
}) {
  // Pairing codes are approved on their own page; keep old links with a code working.
  const { code, from } = await searchParams;
  if (typeof code === "string" && code) {
    redirect(`/settings/agents/pair?code=${encodeURIComponent(code.slice(0, 20))}`);
  }

  const user = await requireUser();

  if (!isAgentPlatformEnabled()) {
    return (
      <div className="mx-auto max-w-xl space-y-1">
        <h1 className="text-3xl font-extrabold text-zk-text">Connect your agent</h1>
        <p className={agentsMutedClass}>The agent platform feature is not enabled in this environment.</p>
      </div>
    );
  }

  const organisationId = await currentOrganisationIdFor(user.id);
  const context = await projectContextFor(prisma, organisationId);
  const activeProject =
    context.projects.find((p) => p.id === context.activeProjectId) ?? context.projects[0] ?? null;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href="/agents/mine" className={`text-sm ${agentsLink}`}>
        ← Back to agents
      </Link>

      <section className={`${agentsSurface} flex flex-col items-center gap-4 px-6 py-10 text-center`}>
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zk-tint text-zk-accent">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 8h16v12H4zM12 4v4M9 14h.01M15 14h.01" />
          </svg>
        </span>
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-zk-text">Connect your agent</h1>
          <p className={agentsMutedClass}>Name it, copy one piece of text into it, and you&apos;re connected.</p>
        </div>

        {!organisationId ? (
          <>
            <p className="text-sm text-zk-text2">Join or create an organisation before you connect an agent.</p>
            <Link href="/organisations" className={agentsPrimaryBtn}>
              Organisations →
            </Link>
          </>
        ) : !activeProject ? (
          <>
            <p className="text-sm text-zk-text2">Create a project first. Your agent works inside a project.</p>
            <Link href="/organisations" className={agentsPrimaryBtn}>
              Organisations →
            </Link>
          </>
        ) : (
          <>
            {/* From Earn (#earn-drafts), connecting goes straight on to My agents. */}
            {/* From Earn (#earn-drafts), connecting goes straight on to My agents. */}
            <ConnectAgentFlow projectId={activeProject.id} next={from === "earn" ? "/earn/home" : undefined} />
            <p className="text-xs text-zk-muted">It will work in <strong className="text-zk-text font-medium">{activeProject.name}</strong>.</p>
            {activeProject.goal ? (
              <div className="w-full text-left mt-2 rounded-xl border border-zk-border/60 bg-zk-subtle/40 p-4 text-xs">
                <div className="font-semibold text-zk-text flex items-center justify-between pb-1 mb-1 border-b border-zk-border/40">
                  <span>Project Context (Brief)</span>
                  <Link href={`/projects/${activeProject.slug}/settings`} className="text-zk-accent hover:underline text-[11px] font-normal">Edit brief</Link>
                </div>
                <p className="text-zk-text2 whitespace-pre-wrap line-clamp-4">{activeProject.goal}</p>
                <p className="mt-2 text-[11px] text-zk-muted italic">This context is automatically provided to connected agents when they pick up tasks in this project.</p>
              </div>
            ) : (
              <div className="w-full text-left mt-2 rounded-xl border border-dashed border-zk-border p-3 text-xs text-zk-muted flex items-center justify-between">
                <span>No project brief set yet. Agents perform better with context on the final build.</span>
                <Link href={`/projects/${activeProject.slug}/settings`} className="text-zk-accent hover:underline shrink-0 ml-2 font-medium">Add brief →</Link>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
