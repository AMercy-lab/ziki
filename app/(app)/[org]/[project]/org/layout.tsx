import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { MEMBERSHIP_ROLE_LABELS } from "@/lib/tenants";
import { loadOrg } from "./org-context";
import { OrgTabs } from "./org-tabs";
import { requireProject } from "@/lib/project-route";
import { prisma } from "@/lib/prisma";

/**
 * The organization admin area (/<org>/<project>/org, #project-urls): everything an organization's owners and
 * admins manage, each in one place. It always shows the organization this
 * device is working in. Every member can open it; only owners and admins (and
 * the site super admin) see controls. Site-wide staff pages stay under /superadmin.
 */
export default async function OrgLayout({ children, params }: { children: React.ReactNode; params: Promise<{ org: string; project: string }> }) {
  const { org: orgParam, project } = await params;
  // The address picks the organisation and checks access (lib/project-route.ts).
  const projectContext = await requireProject(orgParam, project);
  if (!projectContext.isOrgMember) {
    notFound();
  }
  const { org } = await loadOrg();
  if (!org || org.id !== projectContext.tenantId) {
    notFound();
  }

  const pendingJoinCount = org.admin
    ? await prisma.projectJoinRequest.count({
        where: { project: { tenantId: org.id }, status: "pending" },
      })
    : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-[0.06em] text-zk-muted">Organization</p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="min-w-0 truncate text-2xl font-extrabold tracking-tight text-zk-text">{org.name}</h1>
            <Badge className="rounded-full bg-zk-chip text-zk-text2">
              <span className="sr-only">Your role: </span>
              {MEMBERSHIP_ROLE_LABELS[org.role]}
            </Badge>
          </div>
          <p className="text-sm text-zk-text2">
            <span className="font-mono">{org.slug}</span>
            {" · "}
            <Link href="/tenants" className="font-medium text-zk-accent hover:underline">
              Switch organization
            </Link>
          </p>
        </div>
        <OrgTabs pendingJoinCount={pendingJoinCount} />
      </div>
      {children}
    </div>
  );
}
