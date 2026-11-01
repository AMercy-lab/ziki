import Link from "next/link";
import { AgentAvatar } from "@/components/agent-avatar";
import { formatPoints, formatPointsAsDollars } from "@/lib/points/rules";

export type DockAgent = {
  id: string;
  name: string;
  avatar: string | null;
  status: "waiting" | "working" | "idle" | "offline";
  /** What it is doing now, in words (never invented). */
  activity: string;
  /** What its work has earned, in points (#710). */
  earnedPoints: number;
};

const STATUS_LABEL: Record<DockAgent["status"], string> = {
  working: "Working",
  waiting: "Waiting for you",
  idle: "Idle",
  offline: "Offline",
};

/** Each status moves the figure its own way (keyframes in app/globals.css). */
const MOTION: Record<DockAgent["status"], string> = {
  working: "motion-safe:animate-[zk-agent-work_0.9s_ease-in-out_infinite]",
  waiting: "motion-safe:animate-[zk-agent-wave_1.6s_ease-in-out_infinite]",
  idle: "motion-safe:animate-[zk-agent-breathe_3.2s_ease-in-out_infinite]",
  offline: "opacity-40 grayscale",
};

const DOT: Record<DockAgent["status"], string> = {
  working: "bg-emerald-500",
  waiting: "bg-amber-500",
  idle: "bg-sky-400",
  offline: "bg-zk-border",
};

/**
 * Your agents, always in view (#agents-dock): a bar fixed to the bottom of the
 * screen with each agent as a small animated figure. A working one bobs as it
 * works, one waiting for you waves, an idle one breathes, an offline one sits
 * greyed out. Hover for what it is doing; click for its settings. Wide screens
 * only: on phones the bottom of the screen holds the navigation tabs.
 */
/** The strip's height; the page keeps this much free at its foot. */
export const AGENTS_DOCK_HEIGHT = 76;

export function AgentsDock({ agents }: { agents: DockAgent[] }) {
  if (agents.length === 0) return null;
  return (
    // A dedicated strip across the bottom of the screen, its height AGENTS_DOCK_HEIGHT:
    // the page reserves that much at its foot, so everything scrolls above it.
    <nav
      aria-label="Your agents"
      style={{ height: AGENTS_DOCK_HEIGHT }}
      className="fixed inset-x-0 bottom-0 z-30 hidden items-center gap-4 border-t border-zk-border bg-zk-surface px-6 shadow-[0_-2px_10px_rgba(11,23,51,0.06)] lg:flex"
    >
      {/* The agents sit in the middle of the strip; its name ("Your agents") is for screen readers. */}
      <ul className="m-0 mx-auto flex min-w-0 max-w-full list-none items-center justify-center gap-8 overflow-x-auto p-0">
        {agents.map((agent) => (
          <li key={agent.id}>
            <Link
              href="/settings/agents"
              title={`${agent.name} · ${STATUS_LABEL[agent.status]}: ${agent.activity}`}
              aria-label={`${agent.name}, ${STATUS_LABEL[agent.status]}: ${agent.activity}; earned ${formatPointsAsDollars(agent.earnedPoints)}`}
              className="group flex items-center gap-2.5 rounded-xl px-2 py-1 hover:bg-zk-chip focus-visible:outline-2 focus-visible:outline-electric-blue"
            >
              <span className="relative">
                <span className={`block origin-bottom ${MOTION[agent.status]}`}>
                  <AgentAvatar agentId={agent.id} avatar={agent.avatar} size={34} />
                </span>
                <span aria-hidden="true" className={`absolute -right-0.5 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-zk-surface ${DOT[agent.status]}`} />
              </span>
              {/* Its name, and beside the figure what it has earned. */}
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="max-w-32 truncate text-[12px] font-semibold text-zk-text2 group-hover:text-zk-text">{agent.name}</span>
                <span className="font-mono text-[12px] font-bold tabular-nums text-zk-ok-fg" title={`Earned ${formatPoints(agent.earnedPoints)} points`}>
                  {formatPointsAsDollars(agent.earnedPoints)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
