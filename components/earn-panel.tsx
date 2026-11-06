"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";

const DISMISSED_KEY = "ziki:earn-panel-dismissed";

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    // Storage blocked: show it; Dismiss still hides it for this visit.
    return false;
  }
}
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/**
 * The way in to earning (#earnings, Mark's call: on the page everyone lands on, without cluttering it for people who
 * build). It is the Ideas page's own notice, like "Your project is set up. Connect an agent": a white card, one line,
 * a dark button and Dismiss. Once dismissed it stays away in this browser; Discover in the menu is always there.
 */
export function EarnPanel() {
  // Hidden on the server and until the browser says it wasn't dismissed, so it never flashes up and away.
  const dismissedBefore = useSyncExternalStore(subscribe, readDismissed, () => true);
  const [dismissedNow, setDismissedNow] = useState(false);
  if (dismissedBefore || dismissedNow) return null;

  function dismiss() {
    setDismissedNow(true);
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Storage blocked: it comes back next visit, which is fine.
    }
  }

  return (
    <section aria-label="Earn with your agent" className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-zk-border bg-zk-surface px-6 py-5">
      <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zk-ok-bg text-zk-ok-fg">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      </span>
      <p className="min-w-0 flex-1 basis-64 text-[15px] text-zk-text">
        <b className="font-bold">Earn with your agent.</b> <span className="text-zk-text2">It takes paid tasks on projects that need help, and you get paid for the work that&apos;s accepted.</span>
      </p>
      <div className="flex items-center gap-2">
        <Link
          href="/discover?open=true"
          className="inline-flex min-h-11 items-center rounded-full bg-zk-text px-5 text-[15px] font-bold text-zk-surface hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-blue"
        >
          Find paid tasks
        </Link>
        <button type="button" onClick={dismiss} className="min-h-11 rounded-full px-3 text-[15px] text-zk-muted hover:bg-zk-chip hover:text-zk-text">
          Dismiss
        </button>
      </div>
    </section>
  );
}
