"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { isNavItemActive } from "@/lib/header-nav";
import { marketingPath } from "@/lib/project-paths";

const MARKETING_TABS = [
  { section: "tasks", label: "Tasks" },
  { section: "proposals", label: "Proposals" },
  { section: "library", label: "Library" },
  { section: "settings", label: "Settings" },
] as const;

/** The section's sub-tabs. On a phone the bar scrolls sideways inside itself, so the page never does. */
export function MarketingTabs() {
  const pathname = usePathname();
  const slug = useParams<{ project: string }>().project;
  return (
    <nav aria-label="Marketing sections" className="-mx-1 overflow-x-auto px-1 pb-1">
      <ul className="flex w-max gap-0.5 rounded-full bg-zk-seg p-1">
        {MARKETING_TABS.map((tab) => {
          const href = marketingPath(slug, tab.section);
          const on = isNavItemActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={on ? "page" : undefined}
                className={`inline-flex min-h-9 items-center whitespace-nowrap rounded-full px-3.5 text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-blue ${
                  on
                    ? "bg-zk-surface font-bold text-zk-text shadow-[0_1px_3px_rgba(21,18,31,0.12)]"
                    : "font-medium text-zk-text2 hover:text-zk-text"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
