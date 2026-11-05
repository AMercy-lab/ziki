import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { currentTenantIdFor } from "@/lib/tenant-context";
import { isAgentPlatformEnabled } from "@/lib/feature-flags";
import { EARN_WORKSPACE_SLUG } from "@/lib/earn/draft";
import { EarnConnect } from "@/components/earn-connect";
import { ZikiMark } from "@/components/ziki-mark";

export const metadata = { title: "Connect your agent" };

/**
 * Connect your agent, the earn way (#earn-connect): a page of its own, with no site header or bar,
 * where the agent is named, given its one piece of text, and watched until it connects. The agent
 * is made in the Earn workspace's project. If this device isn't working in that workspace yet,
 * /earn/start puts it there first.
 */
export default async function EarnConnectPage() {
  const user = await requireUser();
  if (!isAgentPlatformEnabled()) redirect("/earn");
  // No redirect for someone who already has an agent: creating the agent here re-renders this page mid-flow,
  // and sending them away would cut off the copy step. /earn/start already sends connected people on.

  const tenant = await prisma.tenant.findUnique({ where: { slug: EARN_WORKSPACE_SLUG }, select: { id: true } });
  const project = tenant ? await prisma.project.findFirst({ where: { tenantId: tenant.id }, orderBy: { createdAt: "asc" }, select: { id: true, name: true } }) : null;
  if (!tenant || !project || (await currentTenantIdFor(user.id)) !== tenant.id) redirect("/earn/start");

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-zk-bg">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(46,111,239,0.12),transparent_70%)]" />
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/earn" aria-label="Back to earning" className="inline-flex items-center gap-2 text-zk-text">
          <ZikiMark className="h-8 w-auto" />
          <span className="text-lg font-extrabold tracking-tight">Ziki</span>
        </Link>
        <Link href="/earn" className="text-sm font-semibold text-zk-text2 hover:text-zk-text hover:underline">← Back</Link>
      </header>
      <div className="mx-auto flex w-full max-w-xl flex-col items-center px-5 pb-16 pt-6 sm:px-8 sm:pt-12">
        <EarnConnect projectId={project.id} projectName={project.name} />
      </div>
    </div>
  );
}
