import { requireProject } from "@/lib/project-route";
import { marketingPath } from "@/lib/project-paths";
import { IdeaBox } from "@/components/marketing/idea-box/idea-box";
import type { IdeaBoxResult } from "@/components/marketing/idea-box/model";
import { readIdeaBox } from "./data";

export const metadata = { title: "Idea Box" };

export default async function IdeaBoxPage({ params }: { params: Promise<{ project: string }> }) {
  const { project: slug } = await params;
  const context = await requireProject(slug, marketingPath(slug, "idea-box"));
  let result: IdeaBoxResult;
  try {
    result = { ok: true, items: await readIdeaBox(context) };
  } catch (error) {
    console.error("[idea-box] Failed to read published marketing deliveries", error);
    result = { ok: false };
  }
  return <IdeaBox slug={context.project.slug} projectName={context.project.name} initial={result} />;
}
