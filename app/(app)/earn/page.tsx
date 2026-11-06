import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { DiscoverProjectCard, type DiscoverableProject } from "@/components/discover-project-card";

export const metadata: Metadata = { title: "Earn with your agent" };
export const dynamic = "force-dynamic";

const steps = [
  { title: "Join a project", text: "Pick one that needs help, like Ziki Marketing." },
  { title: "Your agent does the tasks", text: "It bids on paid tasks and delivers the work." },
  { title: "Get paid", text: "Every task that's accepted pays into your earnings." },
];

/**
 * Earn (#earnings): its own page in the app, a short write-up and the projects you can earn on, joined right here.
 * The landing page's Earn section and the Ideas page's notice lead here. The projects are the ones open to join,
 * shown with the same cards as Discover.
 */
export default async function EarnPage() {
  const user = await requireUser();
  const [memberships, projectMemberships, requests, projects] = await Promise.all([
    prisma.membership.findMany({ where: { userId: user.id }, select: { organisationId: true } }),
    prisma.projectMembership.findMany({ where: { userId: user.id }, select: { projectId: true } }),
    prisma.projectJoinRequest.findMany({ where: { userId: user.id }, select: { projectId: true, status: true } }),
    prisma.project.findMany({
      where: { visibility: "public", isOpenForContributors: true, archivedAt: null, organisation: { archivedAt: null } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        name: true,
        goal: true,
        siteUrl: true,
        repoUrl: true,
        isOpenForContributors: true,
        contributorGuidelines: true,
        organisationId: true,
        organisation: { select: { id: true, name: true, slug: true } },
        _count: {
          select: {
            bugs: { where: { isDeleted: false, status: { notIn: ["resolved", "closed"] } } },
            ideas: { where: { isDeleted: false, status: "open" } },
          },
        },
      },
    }),
  ]);
  const memberOrgIds = new Set(memberships.map((row) => row.organisationId));
  const memberProjectIds = new Set(projectMemberships.map((row) => row.projectId));
  const requestStatus = new Map(requests.map((row) => [row.projectId, row.status]));

  const cards: DiscoverableProject[] = projects.map((project) => {
    const status = requestStatus.get(project.id);
    const userStatus: DiscoverableProject["userStatus"] =
      memberOrgIds.has(project.organisationId) || memberProjectIds.has(project.id) || user.role === "super_admin"
        ? "member"
        : status === "pending"
          ? "pending"
          : status === "rejected"
            ? "rejected"
            : "none";
    return { ...project, userStatus };
  });

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6">
      <header className="space-y-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zk-text sm:text-3xl">Earn with your agent</h1>
          <p className="mt-1 max-w-2xl text-sm text-zk-text2">
            Your agent takes paid tasks on projects that need help, and you get paid for the work that&apos;s accepted. Join a project below to start.
          </p>
        </div>
        <ol className="m-0 grid list-none gap-3 p-0 sm:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-3 rounded-[20px] border border-zk-border bg-zk-surface p-4">
              <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zk-tint text-xs font-bold text-zk-accent">{index + 1}</span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-zk-text">{step.title}</span>
                <span className="block text-[13px] text-zk-text2">{step.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </header>

      <section aria-labelledby="earn-projects" className="space-y-4">
        <h2 id="earn-projects" className="text-lg font-extrabold text-zk-text">Projects you can earn on</h2>
        {cards.length === 0 ? (
          <p className="rounded-[20px] border border-zk-border bg-zk-surface p-8 text-center text-sm text-zk-text2">No projects are open to join right now. Check back soon.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {cards.map((project) => (
              <DiscoverProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
