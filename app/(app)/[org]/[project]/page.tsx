import { notFound } from "next/navigation";
import { ProjectOverviewView } from "@/components/project-overview";
import { optionalUser } from "@/lib/auth-helpers";
import { requireProject } from "@/lib/project-route";
import { loadProjectOverview } from "@/lib/project-overview";

type Props = { params: Promise<{ org: string; project: string }> };

/**
 * `/<org>/<project>`: the project's home (#project-urls): its Ideas list, or its
 * Marketing tab when the project is all marketing (#marketing-home). The
 * address picks the project and lib/project-route.ts checks access: a project
 * you can't see is a 404, like any unknown address.
 */
export default async function ProjectOverviewPage({ params }: Props) {
  const { org, project: slug } = await params;
  const user = await optionalUser();
  if (user) await requireProject(org, slug);
  const data = await loadProjectOverview(org, slug, user);
  if (!data) notFound();

  return <ProjectOverviewView data={data} currentUserId={user?.id ?? null} />;
}
