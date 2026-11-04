import { requireMarketingProject } from "@/lib/marketing/section";
import { marketingPath } from "@/lib/project-paths";

export const metadata = { title: "Marketing settings" };

export default async function MarketingSettingsPage({ params }: { params: Promise<{ project: string }> }) {
  const { project: slug } = await params;
  await requireMarketingProject(slug, marketingPath(slug, "settings"));
  return (
    <section className="space-y-1">
      <h2 className="text-xl font-bold tracking-tight text-zk-text">Settings</h2>
      <p className="text-sm text-zk-text2">Marketing settings will appear here.</p>
    </section>
  );
}
