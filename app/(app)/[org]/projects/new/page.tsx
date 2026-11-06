import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/project-route";
import { isTenantAdmin } from "@/lib/agents/membership";
import { CreateProjectForm } from "@/app/(app)/projects/create-project-form";
import { orgHomePath } from "@/lib/project-paths";

export const metadata: Metadata = { title: "Create Project" };

export default async function NewProjectPage({
  params,
}: {
  params: Promise<{ org: string }>;
}) {
  const { org } = await params;
  const { user, tenant } = await requireOrg(org);
  if (!tenant) notFound();

  const canCreate = await isTenantAdmin(user, tenant.id);
  if (!canCreate) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <div className="space-y-1">
        <Link
          href={orgHomePath(tenant.slug)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zk-accent hover:underline"
        >
          ← Back to projects
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight text-zk-text sm:text-3xl">
          Create a new project
        </h1>
        <p className="text-sm text-zk-text2">
          Add a new product or application to <span className="font-semibold text-zk-text">{tenant.name}</span>.
        </p>
      </div>

      <section className="rounded-[20px] border border-zk-border bg-zk-surface p-5 sm:p-7">
        <CreateProjectForm orgSlug={tenant.slug} />
      </section>
    </div>
  );
}
