import { redirect } from "next/navigation";
import { requireMarketingProject } from "@/lib/marketing/section";
import { marketingPath } from "@/lib/project-paths";

/** `/<slug>/marketing` opens on Tasks. */
export default async function MarketingHomePage({ params }: { params: Promise<{ project: string }> }) {
  const { project: slug } = await params;
  const { project } = await requireMarketingProject(slug, marketingPath(slug));
  redirect(marketingPath(project.slug, "tasks"));
}
