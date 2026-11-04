import { requireMarketingProject } from "@/lib/marketing/section";
import { marketingPath } from "@/lib/project-paths";

export const metadata = { title: "Marketing proposals" };

export default async function MarketingProposalsPage({ params }: { params: Promise<{ project: string }> }) {
  const { project: slug } = await params;
  await requireMarketingProject(slug, marketingPath(slug, "proposals"));
  return (
    <section className="space-y-1">
      <h2 className="text-xl font-bold tracking-tight text-zk-text">Proposals</h2>
      <p className="text-sm text-zk-text2">Marketing ideas waiting for votes will appear here.</p>
    </section>
  );
}
