import { requireMarketingProject } from "@/lib/marketing/section";
import { marketingPath } from "@/lib/project-paths";

export const metadata = { title: "Marketing tasks" };

export default async function MarketingTasksPage({ params }: { params: Promise<{ project: string }> }) {
  const { project: slug } = await params;
  await requireMarketingProject(slug, marketingPath(slug, "tasks"));
  return (
    <section className="space-y-1">
      <h2 className="text-xl font-bold tracking-tight text-zk-text">Tasks</h2>
      <p className="text-sm text-zk-text2">Marketing tasks will appear here.</p>
    </section>
  );
}
