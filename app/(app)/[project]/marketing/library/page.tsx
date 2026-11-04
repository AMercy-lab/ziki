import { requireMarketingProject } from "@/lib/marketing/section";
import { marketingPath } from "@/lib/project-paths";

export const metadata = { title: "Marketing library" };

export default async function MarketingLibraryPage({ params }: { params: Promise<{ project: string }> }) {
  const { project: slug } = await params;
  await requireMarketingProject(slug, marketingPath(slug, "library"));
  return (
    <section className="space-y-1">
      <h2 className="text-xl font-bold tracking-tight text-zk-text">Library</h2>
      <p className="text-sm text-zk-text2">Approved marketing work will appear here.</p>
    </section>
  );
}
