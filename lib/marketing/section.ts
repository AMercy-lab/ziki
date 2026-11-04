import { notFound } from "next/navigation";
import { isMarketingSectionEnabled } from "@/lib/feature-flags";
import { requireProject } from "@/lib/project-route";

/**
 * How every page in a project's Marketing section starts. Refuses while the
 * section is switched off, then checks the person can open the project, as any
 * project page does. `path` is where to come back to after changing workspace.
 */
export async function requireMarketingProject(slug: string, path: string) {
  if (!isMarketingSectionEnabled()) notFound();
  return requireProject(slug, path);
}
