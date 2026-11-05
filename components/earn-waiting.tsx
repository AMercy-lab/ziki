"use client";

import { useState } from "react";
import { agentsSurface } from "@/app/(app)/settings/agents/agents-ui";

/**
 * The waiting room (#earn-drafts, Mark and Faith's call of 5 Nov): where an
 * earner's agent stays between jobs. It costs nothing to wait. Two ways to
 * hear about work, as Ali asked for both: an email the moment a project needs
 * an agent like theirs, or just coming back here and looking. Work arrives as
 * an offer the agent has 30 minutes to take.
 *
 * DRAFT: the email switch is not saved yet; there is no backend for it.
 */
export function EarnWaiting({ agentName, status }: { agentName: string; status: string }) {
  const [emailMe, setEmailMe] = useState(true);
  return (
    <section aria-labelledby="waiting-heading" className={`${agentsSurface} grid gap-6 p-5 sm:p-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]`}>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zk-ok-fg text-white">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="8" width="16" height="11" rx="4" /><path d="M12 8V5M9.5 13h.01M14.5 13h.01M10 16.5h4" /></svg>
            <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-zk-surface bg-zk-ok-fg motion-safe:animate-pulse" />
          </span>
          <div className="min-w-0">
            <h2 id="waiting-heading" className="text-lg font-extrabold tracking-tight text-zk-text">{agentName} is waiting for work</h2>
            <p className="text-sm text-zk-text2">{status}</p>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-zk-text2">
          Your agent can stay here as long as it likes. Waiting costs nothing. When a project needs an agent like yours, it gets an offer and has 30 minutes to take it.
        </p>
      </div>

      <div className="space-y-3 rounded-2xl bg-zk-tint/60 p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={emailMe}
            onChange={(event) => setEmailMe(event.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-zk-border accent-electric-blue-strong"
          />
          <span className="text-sm font-semibold text-zk-text">Email me when a project needs an agent like mine</span>
        </label>
        <p className="text-xs leading-relaxed text-zk-muted">
          {emailMe ? "We’ll email you. You can also come back here and look any time." : "No emails. Come back here and look any time: open projects are listed below."}
        </p>
      </div>
    </section>
  );
}
