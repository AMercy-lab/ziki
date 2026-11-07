"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

export interface AgentOption {
  id: string;
  name: string;
}

export interface SkillDetailInteractiveProps {
  skill: {
    id: string;
    title: string;
    slug: string;
    prompt: string;
    icon: string;
    category: string;
    categoryLabel: string;
    author: { name: string; handle: string };
    description: string;
    tags: string[];
    spec: {
      overview: string;
      checklist: string[];
      sampleCommand?: string | null;
      documentationUrl?: string | null;
    };
  };
  agents?: AgentOption[];
  isGuest?: boolean;
}

/* ------------------------------------------------------------------ */
/* Shared client store — one source of truth for selectedAgent + toast */
/* ------------------------------------------------------------------ */

type StoreState = {
  selectedAgent: string;
  toastMessage: string | null;
};

type StoreSnapshot = StoreState & {
  setSelectedAgent: (agent: string) => void;
};

let currentState: StoreState = { selectedAgent: "all", toastMessage: null };
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function setSelectedAgent(agent: string) {
  currentState = { ...currentState, selectedAgent: agent };
  notify();
}

export function getSnapshot(): StoreSnapshot {
  return {
    ...currentState,
    setSelectedAgent,
  };
}

export function getServerSnapshot(): StoreSnapshot {
  return {
    selectedAgent: "all",
    toastMessage: null,
    setSelectedAgent: () => undefined,
  };
}

export function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function setState(next: Partial<StoreState>) {
  currentState = { ...currentState, ...next };
  notify();
}

/* ------------------------------------------------------------------ */
/* CopyCommandButton                                                  */
/* ------------------------------------------------------------------ */

export function CopyCommandButton({
  command,
}: {
  command: string;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      type="button"
      aria-label="Copy execution command"
      className="inline-flex items-center gap-2 rounded-xl border border-zk-border bg-zk-surface px-3 py-2 text-xs font-semibold text-zk-text shadow-xs hover:bg-zk-chip transition"
    >
      {copied ? (
        <>
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
          <span>Copied!</span>
        </>
      ) : (
        <>
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* SkillPromptSection                                                 */
/* ------------------------------------------------------------------ */

export function SkillPromptSection({
  skill,
}: {
  skill: {
    title: string;
    prompt: string;
  };
}) {
  const { selectedAgent } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const selectedAgentName =
    selectedAgent === "all" ? "Default Agent" : selectedAgent;

  const handleCopy = useCallback(() => {
    const targeted = selectedAgent !== "all";
    const promptText = targeted
      ? `Target Agent: ${selectedAgent}\n\n${skill.prompt}`
      : skill.prompt;

    try {
      navigator.clipboard.writeText(promptText);
      setState({
        toastMessage: targeted
          ? `Copied prompt targeted for ${selectedAgent}!`
          : `Copied "${skill.title}" prompt to clipboard!`,
      });
      setTimeout(() => setState({ toastMessage: null }), 2000);
    } catch {
      setState({ toastMessage: "Unable to copy to clipboard." });
      setTimeout(() => setState({ toastMessage: null }), 2000);
    }
  }, [selectedAgent, skill.prompt, skill.title]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zk-muted">
            Agent System Instructions
          </h2>
          <p className="text-xs text-zk-text2">
            System prompt applied when this skill runs on an agent.
          </p>
        </div>
        <button
          onClick={handleCopy}
          type="button"
          aria-label="Copy instructions"
          className="inline-flex items-center gap-2 rounded-xl border border-zk-border bg-zk-surface px-3 py-2 text-xs font-semibold text-zk-text shadow-xs hover:bg-zk-chip transition"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>Copy Instructions</span>
        </button>
      </div>
      {selectedAgent !== "all" && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
          For: {selectedAgentName}
        </span>
      )}
      <div className="relative rounded-2xl border border-zk-border bg-zk-chip p-5">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-zk-divider bg-white/5">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-xs font-mono text-zk-text">prompt.md</span>
          <span className="ml-auto text-xs text-zk-muted">Markdown Instructions</span>
        </div>
        <pre className="overflow-x-auto whitespace-pre-wrap text-xs font-mono text-zk-text leading-relaxed select-text p-4">
          {skill.prompt}
        </pre>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* SkillDetailInteractive                                             */
/* ------------------------------------------------------------------ */

export function SkillDetailInteractive({
  skill,
  agents = [],
  isGuest = false,
}: SkillDetailInteractiveProps) {
  const { selectedAgent, setSelectedAgent } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  // Reset selectedAgent to default when the skill/agent list changes
  useEffect(() => {
    const newDefault = agents.length > 0 ? agents[0].name : "all";
    if (selectedAgent !== newDefault) {
      setSelectedAgent(newDefault);
    }
  }, [agents, selectedAgent, setSelectedAgent]);

  const toastMessage = currentState.toastMessage;

  const targeted = selectedAgent !== "all";

  const handleCopy = useCallback(() => {
    const promptText = targeted
      ? `Target Agent: ${selectedAgent}\n\n${skill.prompt}`
      : skill.prompt;

    try {
      navigator.clipboard.writeText(promptText);
      setState({
        toastMessage: targeted
          ? `Copied prompt targeted for ${selectedAgent}!`
          : `Copied "${skill.title}" prompt to clipboard!`,
      });
      setTimeout(() => setState({ toastMessage: null }), 2000);
    } catch {
      setState({ toastMessage: "Unable to copy to clipboard." });
      setTimeout(() => setState({ toastMessage: null }), 2000);
    }
  }, [selectedAgent, skill.prompt, skill.title, targeted]);

  // First option label logic
  let allLabel: string;
  if (agents.length > 0) {
    allLabel = "For: All Agents (Generic)";
  } else if (isGuest) {
    allLabel = "For: Any Agent";
  } else {
    allLabel = "For: Default Agent";
  }

  return (
    <section className="space-y-6">
      {/* Hero Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            aria-label="Target agent"
            className="shrink-0 appearance-none rounded-xl border border-zk-border bg-zk-chip/60 hover:bg-zk-chip py-2 pl-3.5 pr-8 text-xs font-semibold text-zk-text focus:border-blue-600 focus:outline-hidden transition cursor-pointer"
          >
            <option value="all">{allLabel}</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.name}>
                For: {agent.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleCopy}
            type="button"
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition active:scale-[0.98]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy Agent Skill Prompt
          </button>
        </div>

        {/* Toast */}
        {toastMessage && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-zk-border bg-zk-surface px-5 py-3.5 text-sm font-semibold text-zk-text shadow-2xl transition-all"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zk-ok-bg text-zk-ok-fg text-xs font-bold">
              ✓
            </span>
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      <SkillPromptSection skill={skill} />
    </section>
  );
}
