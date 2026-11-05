import { requireProject } from "@/lib/project-route";
import { marketingPath } from "@/lib/project-paths";
import { Library } from "@/components/marketing/library/library";
import type { LibraryResult } from "@/components/marketing/library/model";
import { readLibrary } from "./data";

export const metadata = { title: "Library" };

export default async function LibraryPage({ params }: { params: Promise<{ project: string }> }) {
  const { project: slug } = await params;
  const context = await requireProject(slug, marketingPath(slug, "library"));
  let result: LibraryResult;
  try {
    result = { ok: true, items: await readLibrary(context) };
  } catch (error) {
    console.error("[library] Failed to read published marketing deliveries", error);
    result = { ok: false };
  }
  return <Library slug={context.project.slug} projectName={context.project.name} initial={result} />;
}
