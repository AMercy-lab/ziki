"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import type { AgentLevel } from "@prisma/client";
import { AGENT_LEVEL_LABELS } from "@/lib/agents/levels";
import { agentPageHref } from "@/lib/header-nav";
import { AgentAvatar } from "@/components/agent-avatar";
import { LocalTime } from "@/components/local-time";
import { RelativeTime } from "@/components/relative-time";
import { AgentControls } from "./agent-controls";
import { AgentRowKey } from "./agent-row-key";
import type { AgentProjectChoice } from "./create-agent-form";
import {
  agentsMutedClass,
  agentsSurface,
  levelBadgeClass,
} from "./agents-ui";

export type ManageAgentItem = {
  id: string;
  name: string;
  model: string | null;
  level: AgentLevel;
  burst: boolean;
  burstUntil: string | null;
  createdAt: string;
  revokedAt: string | null;
  personal: boolean;
  /** The owner's avatar pick; null wears the automatic robot. */
  avatar: string | null;
  currentProjectId: string | null;
  recent: boolean;
  apiKeys: {
    id: string;
    prefix: string;
    apiKey: string | null;
    projectId: string | null;
    projectName: string | null;
    lastUsedAt: string | null;
  }[];
};

export function ManageAgentsList({
  agents,
  activeCount,
  maxActive,
  levels,
  projects,
  now,
  canSetBurst,
  beside,
  before,
  activity,
}: {
  agents: ManageAgentItem[];
  activeCount: number;
  maxActive: number;
  levels: AgentLevel[];
  projects: AgentProjectChoice[];
  now: string;
  canSetBurst: boolean;
  /** A card at the top of the page (Earn's money card, #earn-drafts). */
  beside?: ReactNode;
  /** Shown under the cards, above the agents (Earn's tasks). */
  before?: ReactNode;
  /** What an agent is doing now, by agent id, shown under its name (Earn, #earn-drafts). */
  activity?: Record<string, string>;
}) {
  const [query, setQuery] = useState("");

  const visible = agents.filter((agent) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
      agent.name.toLowerCase().includes(q) ||
      (agent.model?.toLowerCase().includes(q) ?? false) ||
      AGENT_LEVEL_LABELS[agent.level].toLowerCase().includes(q)
    );
  });

  const meterPct = Math.min(100, Math.round((activeCount / Math.max(maxActive, 1)) * 100));
  const legacyCount = agents.reduce(
    (count, agent) => count + agent.apiKeys.filter((key) => !key.apiKey).length,
    0,
  );

  const manageBody = (
    <section aria-labelledby="your-agents" className="space-y-3">
      {/* One header for the list: what it is, how many are active of the limit, and search once there are enough to need it. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 id="your-agents" className="text-base font-semibold text-zk-text">
          Your agents
        </h2>
        <span className="inline-flex items-center gap-2 rounded-full bg-zk-chip px-3 py-1 text-xs font-bold text-zk-text2">
          {activeCount} of {maxActive} active
          <span aria-hidden="true" className="block h-1.5 w-12 overflow-hidden rounded-full bg-zk-seg">
            <span className="block h-full rounded-full bg-electric-blue-strong" style={{ width: `${meterPct}%` }} />
          </span>
        </span>
        {agents.length > 3 ? (
          <label className="relative block w-full sm:ml-auto sm:w-64">
            <span className="sr-only">Search agents</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search agents"
              className="h-10 w-full rounded-full border border-zk-border bg-zk-surface px-4 text-sm text-zk-text placeholder:text-zk-muted focus:border-electric-blue focus:outline-none focus:ring-2 focus:ring-electric-blue/20"
            />
          </label>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <p className={`${agentsMutedClass} ${agentsSurface} p-6`}>
          {agents.length === 0 ? "No agents yet." : "No agents match your search."}
        </p>
      ) : (
        <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-2">
          {visible.map((agent) => {
            const lastUsed = agent.apiKeys.find((key) => key.lastUsedAt)?.lastUsedAt ?? null;
            const status = !agent.revokedAt ? activity?.[agent.id] : undefined;
            return (
              // Two cards to a row, as on the live site: who it is and its key on top, then a divider
              // and its settings. The name's link covers the top part, so a click there opens the agent.
              <li
                key={agent.id}
                className={`${agentsSurface} group relative flex flex-col overflow-hidden transition hover:border-electric-blue/50 hover:shadow-[0_10px_28px_rgba(11,23,51,0.08)]`}
              >
                <div className="relative flex flex-1 flex-wrap items-start gap-x-4 gap-y-3 p-4 sm:p-5">
                  <div className="relative shrink-0">
                    <AgentAvatar agentId={agent.id} avatar={agent.avatar} size={52} />
                    {!agent.revokedAt ? (
                      <span
                        className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-zk-surface ${
                          agent.recent || status ? "bg-zk-ok-fg" : "bg-slate-400"
                        }`}
                        aria-hidden
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1 basis-56 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={agentPageHref(agent.name)}
                        className="break-words text-[17px] font-extrabold tracking-tight text-zk-text after:absolute after:inset-0 after:content-[''] hover:text-zk-accent focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-electric-blue"
                      >
                        {agent.name}
                        {agent.personal ? <span className="font-normal text-zk-muted"> · personal</span> : null}
                      </Link>
                      <span className={levelBadgeClass(agent.level)}>{AGENT_LEVEL_LABELS[agent.level]}</span>
                      {agent.revokedAt ? (
                        <span className="inline-flex items-center rounded-full bg-zk-bad-bg px-2.5 py-0.5 text-xs font-bold text-zk-bad-fg">
                          Revoked
                        </span>
                      ) : null}
                      {agent.model ? <span className="text-sm text-zk-muted">{agent.model}</span> : null}
                    </div>
                    {status ? (
                      <p className="flex items-center gap-2 text-sm text-zk-text2">
                        <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-zk-ok-fg" />
                        {status}
                      </p>
                    ) : null}
                    <p className="text-xs text-zk-muted">
                      {agent.revokedAt ? (
                        <>
                          Revoked <LocalTime date={agent.revokedAt} />
                        </>
                      ) : agent.apiKeys.length === 0 ? (
                        <>
                          No key · Added <LocalTime date={agent.createdAt} />
                        </>
                      ) : (
                        <>
                          {lastUsed ? (
                            <>
                              Last used <RelativeTime date={lastUsed} />
                            </>
                          ) : (
                            <>Never used</>
                          )}
                          {" · "}
                          Added <LocalTime date={agent.createdAt} />
                        </>
                      )}
                    </p>
                  </div>
                  {!agent.revokedAt && agent.apiKeys.length ? (
                    <div className="relative z-10 w-full space-y-1.5">
                      {agent.apiKeys.map((key) => (
                        <AgentRowKey
                          key={key.id}
                          apiKey={key.apiKey}
                          prefix={key.prefix}
                          projectId={key.projectId}
                          projectName={key.projectName}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="relative z-10 mx-4 mt-auto border-t border-zk-divider pb-4 pt-4 sm:mx-5 sm:pb-5">
                  {agent.revokedAt ? (
                    <AgentControls
                      revoked
                      personal={agent.personal}
                      agentId={agent.id}
                      agentName={agent.name}
                      level={agent.level}
                      levels={levels}
                      projects={projects}
                      now={now}
                    />
                  ) : (
                    <AgentControls
                      personal={agent.personal}
                      agentId={agent.id}
                      agentName={agent.name}
                      level={agent.level}
                      levels={levels}
                      projects={projects}
                      currentProjectId={agent.currentProjectId}
                      burst={agent.burst}
                      burstUntil={agent.burstUntil}
                      now={now}
                      canSetBurst={canSetBurst}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );

  return (
    <div className="space-y-6">
      {/* Earn (#earn-drafts): the money card, then the tasks, then the agents. */}
      {beside}
      {before}

      {legacyCount > 0 ? (
        <div className="rounded-[20px] border border-zk-warn-bd bg-zk-warn-bg/50 px-4 py-3 text-sm text-zk-warn-fg">
          <p className="font-bold">
            {legacyCount} {legacyCount === 1 ? "key" : "keys"} can&apos;t be copied
          </p>
          <p className="mt-0.5 text-xs">
            They were issued before keys could be copied again. Regenerate a key to get a copyable one — the new key
            stays on the same row.
          </p>
        </div>
      ) : null}

      {manageBody}
    </div>
  );
}
