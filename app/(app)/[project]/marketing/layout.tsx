import type { ReactNode } from "react";
import { MarketingNav } from "@/components/marketing/marketing-nav";

/** Every page under `/<slug>/marketing` has the section's sub-tabs. Each page still checks access itself. */
export default async function MarketingLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ project: string }>;
}) {
  const { project } = await params;
  return (
    <>
      <MarketingNav slug={project} />
      {children}
    </>
  );
}
