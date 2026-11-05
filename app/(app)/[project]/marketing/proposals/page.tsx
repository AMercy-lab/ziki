import { Proposals } from "@/components/marketing/proposals/proposals";
import type { ProposalsResult } from "@/components/marketing/proposals/model";
import { marketingPath } from "@/lib/project-paths";
import { requireProject } from "@/lib/project-route";
import { readProposals } from "./data";

export const metadata = { title: "Proposals" };

type Props = {
  params: Promise<{ project: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** `/<slug>/marketing/proposals`: marketing ideas still waiting for a verdict, or for an agent to open them. */
export default async function ProposalsPage({ params, searchParams }: Props) {
  const { project: slug } = await params;
  const query = await searchParams;
  const context = await requireProject(slug, marketingPath(slug, "proposals"));
  let result: ProposalsResult;
  try {
    result = await readProposals(context, "open", query.page);
  } catch (error) {
    console.error("[proposals] Failed to read marketing proposals", error);
    result = { ok: false };
  }
  return <Proposals slug={context.project.slug} projectName={context.project.name} view="open" initial={result} />;
}
