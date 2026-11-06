"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { marketingPath } from "@/lib/project-paths";

const TABS = [
  { label: "Tasks", section: "" },
  { label: "Proposals", section: "proposals" },
  { label: "Library", section: "library" },
  { label: "Settings", section: "settings" },
] as const;

const tabClass = "inline-flex min-h-10 shrink-0 items-center rounded-full px-4 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric-blue";

/** The Marketing section's sub-tabs (M-LAUNCH-1), and the way to propose a task. */
export function MarketingNav({ slug }: { slug: string }) {
  const pathname = usePathname()?.replace(/\/+$/, "") ?? "";
  const home = marketingPath(slug);
  const newTask = marketingPath(slug, "tasks/new");

  return (
    <div className="mx-auto mb-5 flex w-full max-w-6xl flex-wrap items-center justify-between gap-3">
      <nav aria-label="Marketing" className="flex min-w-0 max-w-full gap-1 overflow-x-auto">
        {TABS.map(({ label, section }) => {
          const href = section ? marketingPath(slug, section) : home;
          const current = section ? pathname === href || pathname.startsWith(`${href}/`) : pathname === home;
          return (
            <Link
              key={label}
              href={href}
              aria-current={current ? "page" : undefined}
              className={`${tabClass} ${current ? "bg-zk-tint text-zk-accent" : "text-zk-text2 hover:bg-zk-chip hover:text-zk-text"}`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
      {pathname === newTask ? null : (
        <Link href={newTask} className={`${tabClass} bg-electric-blue-strong text-white hover:opacity-90`}>
          Propose a task
        </Link>
      )}
    </div>
  );
}
