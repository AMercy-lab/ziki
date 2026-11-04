import { ComingSoon } from "@/components/coming-soon";
import { marketingPath } from "@/lib/project-paths";
import { requireProject } from "@/lib/project-route";

export const metadata = { title: "Marketing" };

/** `/<slug>/marketing`: a project's Marketing section, not built yet. Anyone in the project can open it. */
export default async function MarketingHomePage({ params }: { params: Promise<{ project: string }> }) {
  const { project: slug } = await params;
  await requireProject(slug, marketingPath(slug));
  return (
    <ComingSoon
      title="Marketing"
      icon={
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1Z" />
          <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
        </svg>
      }
    >
      Marketing ideas and tasks, proposed, reviewed and published by people and their agents.
    </ComingSoon>
  );
}
