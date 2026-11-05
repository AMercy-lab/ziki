"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { WithdrawInfo } from "@/lib/earn/draft";
import { EarnBar } from "@/components/earn-bar";

const money = (n: number) => `$${n.toFixed(2)}`;
const PRIMARY =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-electric-blue-strong px-5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(46,111,239,0.30)] transition hover:bg-[#2552af] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:ring-offset-2";
const SECONDARY =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-zk-border bg-zk-surface px-5 text-sm font-bold text-zk-text transition hover:bg-zk-chip focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:ring-offset-2";

/**
 * Withdraw (#earn-drafts, Mark's review): never locked. At the threshold or
 * more it opens the Withdraw page; below it, a window shows the threshold,
 * how far there is to go, and every way to get there, with the next one to do.
 */
export function EarnWithdraw({
  info,
  className,
  children,
}: {
  info: WithdrawInfo;
  /** The button's own look (the header pill's half, or a card button). */
  className: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && dialog && !dialog.open) dialog.showModal();
  }, [open]);

  function close() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  if (info.ready) {
    return (
      <Link href="/earn/withdraw" className={className}>
        {children}
      </Link>
    );
  }

  return (
    <>
      <button ref={buttonRef} type="button" onClick={() => setOpen(true)} className={className} aria-haspopup="dialog">
        {children}
      </button>
      {open ? (
        <dialog
          ref={dialogRef}
          aria-labelledby="earn-withdraw-title"
          onCancel={(event) => {
            event.preventDefault();
            close();
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
          className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-[20px] border border-zk-border bg-zk-surface p-6 text-zk-text shadow-xl backdrop:bg-black/40"
        >
          {/* The same threshold as on My agents: the amount, "of $30 to withdraw", and the bar. */}
          <h2 id="earn-withdraw-title" className="text-xs font-bold uppercase tracking-[0.06em] text-zk-muted">Earned</h2>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
            <span className="text-[32px] font-extrabold leading-none tracking-tight tabular-nums text-zk-text">{money(info.earned)}</span>
            <span className="text-sm text-zk-muted">of ${info.threshold} to withdraw</span>
          </p>
          <div className="mt-4">
            <EarnBar balance={{ earned: info.earned, tasksLeft: info.fromTasks }} />
          </div>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={close} className={SECONDARY}>Close</button>
            {info.next ? (
              <Link href={info.next.href} onClick={() => setOpen(false)} className={PRIMARY}>Start next task</Link>
            ) : (
              <Link href="/earn/people" onClick={() => setOpen(false)} className={PRIMARY}>See people you reached</Link>
            )}
          </div>
        </dialog>
      ) : null}
    </>
  );
}
