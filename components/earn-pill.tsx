"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { WithdrawInfo } from "@/lib/earn/draft";
import { EarnBar } from "@/components/earn-bar";
import { EarnWithdraw } from "@/components/earn-withdraw";

const money = (n: number) => `$${n.toFixed(2)}`;
const RING = 2 * Math.PI * 9;

/**
 * The earner's balance in the header (#earn-drafts, Mark's call of 5 Nov): one pill that reads
 * "Balance $10.00 / $30 min", with a small ring filling toward the threshold. Clicking it drops
 * a panel down with the bar, the next thing to do and Withdraw. Withdraw opens a window over
 * the page (it never takes you to another page).
 */
export function EarnPill({ info, className = "" }: { info: WithdrawInfo; className?: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const share = Math.min(1, info.earned / info.threshold);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      // The Withdraw window is a top-layer dialog inside this root, so clicks in it never count as "outside".
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector("dialog[open]")) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="earn-menu"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 items-center gap-2.5 rounded-full border border-zk-border bg-zk-surface pl-2 pr-3 text-zk-text hover:bg-zk-chip focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-blue"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 -rotate-90" aria-hidden="true">
          <circle cx="12" cy="12" r="9" fill="none" strokeWidth="3.5" className="stroke-zk-seg" />
          <circle cx="12" cy="12" r="9" fill="none" strokeWidth="3.5" strokeLinecap="round" className={info.ready ? "stroke-zk-ok-fg" : "stroke-electric-blue-strong"} strokeDasharray={RING} strokeDashoffset={RING * (1 - share)} />
        </svg>
        <span className="flex items-baseline gap-1.5 whitespace-nowrap">
          <span className="text-xs text-zk-muted max-sm:hidden">Balance</span>
          <span className="text-[14px] font-bold tabular-nums">{money(info.earned)}</span>
          <span className="text-xs text-zk-muted max-md:hidden">/ ${info.threshold} min</span>
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0 text-zk-muted">
          <path d={open ? "m18 15-6-6-6 6" : "m6 9 6 6 6-6"} />
        </svg>
      </button>

      {open ? (
        <div id="earn-menu" className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(22rem,calc(100vw-2rem))] rounded-[20px] border border-zk-border bg-zk-surface p-5 shadow-[0_18px_44px_rgba(11,23,51,0.16)]">
          <p className="flex items-baseline gap-2">
            <span className="text-[30px] font-extrabold leading-none tracking-tight tabular-nums text-zk-text">{money(info.earned)}</span>
            <span className="text-sm text-zk-muted">{info.ready ? "ready to withdraw" : `of $${info.threshold} to withdraw`}</span>
          </p>
          <div className="mt-3">
            <EarnBar balance={{ earned: info.earned, tasksLeft: info.fromTasks }} />
          </div>
          {info.next ? (
            <p className="mt-4 rounded-[14px] bg-zk-tint/70 px-3.5 py-2.5 text-sm text-zk-text2">
              <span className="font-bold text-zk-text">Next: {info.next.title}</span> <span className="font-bold text-zk-ok-fg">+${info.next.pay}</span>{" "}
              <Link href={info.next.href} onClick={() => setOpen(false)} className="font-semibold text-zk-accent hover:underline">Start</Link>
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <EarnWithdraw
              info={info}
              className={`inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:ring-offset-2 ${
                info.ready ? "bg-electric-blue-strong text-white hover:bg-[#2552af]" : "border border-zk-border bg-zk-surface text-zk-text hover:bg-zk-chip"
              }`}
            >
              Withdraw
            </EarnWithdraw>
            <Link href="/earn/earnings" onClick={() => setOpen(false)} className="text-sm font-semibold text-zk-accent hover:underline">See my earnings</Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
