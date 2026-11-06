import { notFound } from "next/navigation";
import { requireProject } from "@/lib/project-route";
import { projectPath } from "@/lib/project-paths";
import { FeaturePlanEditor } from "../feature-plan-editor";

export const metadata = { title: "Plan a feature · Ziki" };

export default async function NewFeaturePlanPage({ params }: { params: Promise<{ org: string; project: string }> }) {
  const { org, project: slug } = await params;
  const { project, canContribute } = await requireProject(org, slug);
  if (!canContribute) notFound();
  return <main className="mx-auto max-w-4xl space-y-6 text-zk-text [overflow-wrap:anywhere]">
    <header><h1 className="text-2xl font-bold">Plan a feature</h1><p className="mt-2 text-sm text-zk-text2">Describe one capability you want to build. Review the suggested work, choose what belongs in the first version, and define the end-to-end result.</p></header>
    <FeaturePlanEditor projectId={project.id} basePath={projectPath(project.ref, "/features")} />
  </main>;
}
