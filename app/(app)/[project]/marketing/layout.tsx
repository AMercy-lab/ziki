import { notFound } from "next/navigation";
import { isMarketingSectionEnabled } from "@/lib/feature-flags";
import { MarketingTabs } from "./marketing-tabs";

/**
 * A project's Marketing section (docs/marketing-migration-plan.md). Each sub-tab
 * is its own folder and checks access itself with `requireMarketingProject`: a
 * layout doesn't know which sub-tab was asked for, and doesn't run again when
 * someone moves between them.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  if (!isMarketingSectionEnabled()) notFound();
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="space-y-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-zk-text">Marketing</h1>
        <MarketingTabs />
      </div>
      {children}
    </div>
  );
}
