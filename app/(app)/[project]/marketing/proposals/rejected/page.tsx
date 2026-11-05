import { Proposals } from "@/components/marketing/proposals/proposals";
import type { ProposalsResult } from "@/components/marketing/proposals/model";
import { marketingPath } from "@/lib/project-paths";
import { requireProject } from "@/lib/project-route";
import { readProposals } from "../data";

export const metadata = { title: "Rejected proposals" };

type Props = {
  params: Promise<{ project: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** `/<slug>/marketing/proposals/rejected`: proposals a manager rejected, plus archived ones, with their verdicts. */
export default async function RejectedProposalsPage({ params, searchParams }: Props) {
  const { project: slug } = await params;
  const query = await searchParams;
  const context = await requireProject(slug, marketingPath(slug, "proposals/rejected"));
  let result: ProposalsResult;
  try {
    result = await readProposals(context, "rejected", query.page);
  } catch (error) {
    console.error("[proposals] Failed to read rejected marketing proposals", error);
    result = { ok: false };
  }
  return <Proposals slug={context.project.slug} projectName={context.project.name} view="rejected" initial={result} />;
}
