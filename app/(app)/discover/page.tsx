import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { optionalUser } from "@/lib/auth-helpers";
import { DiscoverProjectCard, type DiscoverableProject } from "@/components/discover-project-card";

export const metadata: Metadata = { title: "Discover Projects" };

type DiscoverPageProps = {
  searchParams: Promise<{
    q?: string;
    open?: string;
  }>;
};

export default async function DiscoverPage(props: DiscoverPageProps) {
  const user = await optionalUser();
  const searchParams = await props.searchParams;
  const query = (searchParams.q ?? "").trim();
  const openOnly = searchParams.open === "true";

  // 1. Fetch user's existing memberships and requests in parallel if logged in
  let memberTenantIds = new Set<string>();
  let memberProjectIds = new Set<string>();
  let requestStatusMap = new Map<string, string>();

  if (user) {
    const [userOrgMemberships, userProjectMemberships, userJoinRequests] = await Promise.all([
      prisma.membership.findMany({
        where: { userId: user.id },
        select: { tenantId: true },
      }),
      prisma.projectMembership.findMany({
        where: { userId: user.id },
        select: { projectId: true },
      }),
      prisma.projectJoinRequest.findMany({
        where: { userId: user.id },
        select: { projectId: true, status: true },
      }),
    ]);
    memberTenantIds = new Set(userOrgMemberships.map((m) => m.tenantId));
    memberProjectIds = new Set(userProjectMemberships.map((m) => m.projectId));
    requestStatusMap = new Map(userJoinRequests.map((r) => [r.projectId, r.status]));
  }

  // 2. Query public projects
  const where: any = {
    visibility: "public",
    archivedAt: null,
    tenant: { archivedAt: null },
  };

  if (openOnly) {
    where.isOpenForContributors = true;
  }

  if (query) {
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { goal: { contains: query, mode: "insensitive" } },
      { tenant: { name: { contains: query, mode: "insensitive" } } },
    ];
  }

  const projects = await prisma.project.findMany({
    where,
    orderBy: [{ isOpenForContributors: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      goal: true,
      siteUrl: true,
      repoUrl: true,
      isOpenForContributors: true,
      contributorGuidelines: true,
      tenantId: true,
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      _count: {
        select: {
          bugs: { where: { isDeleted: false, status: { notIn: ["resolved", "closed"] } } },
          ideas: { where: { isDeleted: false, status: "open" } },
        },
      },
    },
  });

  const cardsData: DiscoverableProject[] = projects.map((p) => {
    let userStatus: "member" | "pending" | "rejected" | "none" | "guest" = !user ? "guest" : "none";
    if (user) {
      if (memberTenantIds.has(p.tenantId) || memberProjectIds.has(p.id) || user.role === "super_admin") {
        userStatus = "member";
      } else if (requestStatusMap.has(p.id)) {
        const status = requestStatusMap.get(p.id);
        if (status === "pending") userStatus = "pending";
        else if (status === "rejected") userStatus = "rejected";
      }
    }

    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      goal: p.goal,
      siteUrl: p.siteUrl,
      repoUrl: p.repoUrl,
      isOpenForContributors: p.isOpenForContributors,
      contributorGuidelines: p.contributorGuidelines,
      tenant: p.tenant,
      _count: p._count,
      userStatus,
    };
  });

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zk-text sm:text-3xl">
            Discover Projects
          </h1>
          <p className="mt-1 text-sm text-zk-text2">
            Explore open projects, find products to contribute to, and collaborate with teams.
          </p>
        </div>
        <Link
          href="/tenants"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zk-accent hover:underline"
        >
          ← Back to Workspaces
        </Link>
      </div>

      {/* Search and Filters */}
      <form method="GET" className="flex flex-col gap-3 rounded-[16px] border border-zk-border bg-zk-surface p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search projects by name, goal, or organization..."
            className="w-full rounded-xl border border-zk-border bg-zk-card py-2 pl-9 pr-3 text-sm text-zk-text placeholder:text-zk-muted focus:border-zk-accent focus:outline-none focus:ring-1 focus:ring-zk-accent"
          />
          <svg
            className="absolute left-3 top-2.5 h-4 w-4 text-zk-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </div>

        <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap text-sm text-zk-text2">
          <input
            type="checkbox"
            name="open"
            value="true"
            defaultChecked={openOnly}
            className="h-4 w-4 rounded border-zk-border text-zk-accent focus:ring-zk-accent"
          />
          Open for contributors only
        </label>

        <button
          type="submit"
          className="rounded-xl bg-zk-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-zk-accent/90 focus:outline-none"
        >
          Search
        </button>
      </form>

      {/* Project Grid */}
      {cardsData.length === 0 ? (
        <div className="rounded-[20px] border border-zk-border bg-zk-surface p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zk-chip text-2xl">
            🔍
          </div>
          <h3 className="mt-4 text-base font-semibold text-zk-text">No projects found</h3>
          <p className="mt-1 text-sm text-zk-text2">
            {query || openOnly
              ? "Try adjusting your search query or filters."
              : "There are no public projects available right now. Check back soon or create your own organization."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {cardsData.map((project) => (
            <DiscoverProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
