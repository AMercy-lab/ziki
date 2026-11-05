import Link from "next/link";
import { Suspense } from "react";
import { requireSuperAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { toSingleQueryParam } from "@/lib/search";
import { buildUserSearchWhere } from "@/lib/user-search";
import { LocalTime } from "@/components/local-time";
import { Avatar } from "@/components/avatar";
import { SiteRoleActions } from "@/components/site-role-actions";
import { UserSearch } from "@/components/user-search";
import { PaginationControls } from "@/components/pagination-controls";
import { calculatePagination } from "@/lib/pagination";
import { reviewSubmissionFormAction } from "@/app/actions/skill-submissions";

/* Distinct browser-tab title; the root layout appends "· Ziki". */
export const metadata = { title: "Site admin" };

/**
 * Site staff only: every account on the site and its site-wide role. An
 * organization's members, their roles and their agents are managed by that
 * organization's owners and admins in /org, not here.
 */
const USERS_PER_PAGE = 25;

async function fetchSkillSubmissions() {
  return prisma.skillSubmission.findMany({
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      category: true,
      categoryLabel: true,
      summary: true,
      tags: true,
      bounty: true,
      status: true,
      reviewedAt: true,
      rejectionReason: true,
      createdAt: true,
      submittedBy: { select: { id: true, name: true, email: true, image: true } },
      reviewedBy: { select: { id: true, name: true, email: true } },
    },
  });
}

type SkillSubmissionRow = Awaited<ReturnType<typeof fetchSkillSubmissions>>[number];

type SearchParams = Promise<{
  q?: string | string[];
  page?: string | string[];
  tab?: string | string[];
  [key: string]: string | string[] | undefined;
}>;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const actor = await requireSuperAdmin();

  const params = searchParams ? await searchParams : {};
  const tab = (toSingleQueryParam(params.tab) ?? "users") as "users" | "approvals";
  const query = toSingleQueryParam(params.q)?.trim() ?? "";

  let submissions: SkillSubmissionRow[] = [];
  if (tab === "approvals") {
    submissions = await fetchSkillSubmissions();
  }

  const where = buildUserSearchWhere(query);
  const totalCount = await prisma.user.count({ where });
  const pagination = calculatePagination({
    page: params.page,
    pageSize: USERS_PER_PAGE,
    totalCount,
  });

  const users = await prisma.user.findMany({
    where,
    // Staff first (the Role enum is declared user, admin, super_admin), then by name.
    orderBy: [{ role: "desc" }, { name: "asc" }],
    skip: pagination.skip,
    take: pagination.take,
    select: { id: true, name: true, email: true, image: true, role: true, createdAt: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zk-text sm:text-2xl">Site admin</h1>
          <p className="mt-1 max-w-2xl text-sm text-zk-text2">
            Every account on the site and its site role, which applies across all organizations.
            Organization roles, members and agents are managed by each organization&apos;s owners
            and admins on its Organization page.
          </p>
          <p className="mt-2 text-sm">
            <Link href="/superadmin/rewards" className="font-medium text-zk-accent hover:underline">
              Platform rewards
            </Link>
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <Suspense
            fallback={<div className="h-9 w-full animate-pulse rounded-lg bg-slate-100 sm:w-64" />}
          >
            <UserSearch />
          </Suspense>
        </div>
      </div>

      <div className="flex gap-2 border-b border-zk-border pb-2">
        <Link
          href={tab === "users" ? "/superadmin/users" : "/superadmin/users?tab=users"}
          className={[
            "px-3 py-2 text-sm border-b-2",
            tab === "users"
              ? "border-zk-accent font-medium text-zk-accent"
              : "border-transparent text-zk-muted hover:text-zk-text",
          ].join(" ")}
        >
          Users
        </Link>
        <Link
          href={tab === "approvals" ? "/superadmin/users" : "/superadmin/users?tab=approvals"}
          className={[
            "px-3 py-2 text-sm border-b-2",
            tab === "approvals"
              ? "border-zk-accent font-medium text-zk-accent"
              : "border-transparent text-zk-muted hover:text-zk-text",
          ].join(" ")}
        >
          Skill approvals
        </Link>
      </div>

      {tab === "approvals" ? (
        <SkillApprovalsList submissions={submissions} />
      ) : users.length > 0 ? (
        <div className="overflow-x-auto rounded-[20px] border border-zk-border bg-zk-surface">
          <table className="min-w-full divide-y divide-zk-border text-sm">
            <thead className="bg-zk-tint text-left text-xs font-semibold uppercase tracking-wide text-zk-muted">
              <tr>
                <th className="whitespace-nowrap px-4 py-3">User</th>
                <th className="whitespace-nowrap px-4 py-3">Site role</th>
                <th className="whitespace-nowrap px-4 py-3">Signed up</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zk-divider">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-zk-tint/80">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={user.name} image={user.image} size="md" />
                      <div className="min-w-0">
                        <div className="font-medium text-zk-text">{user.name}</div>
                        <div className="break-all text-xs text-zk-muted sm:text-sm">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <SiteRoleActions
                      userId={user.id}
                      userName={user.name}
                      siteRole={user.role}
                      disabled={user.id === actor.id || user.role === "super_admin"}
                    />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-zk-text2">
                    <LocalTime date={user.createdAt} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : query ? (
        <div className="px-4 py-12 text-center">
          <p className="font-medium text-zk-text">No account matching &ldquo;{query}&rdquo;</p>
          <Link
            href="/superadmin/users"
            className="mt-3 inline-flex text-sm font-medium text-zk-accent hover:underline"
          >
            Clear search
          </Link>
        </div>
      ) : (
        <p className="px-4 py-8 text-center text-sm text-zk-muted">No accounts yet.</p>
      )}

      {tab === "users" && (
        <PaginationControls
          page={pagination.page}
          totalPages={pagination.totalPages}
          totalCount={pagination.totalCount}
          from={pagination.from}
          to={pagination.to}
          queryParams={{ q: query || undefined }}
          basePath="/superadmin/users"
          itemLabel="user"
        />
      )}
    </div>
  );
}

function SkillApprovalsList({
  submissions,
}: {
  submissions: SkillSubmissionRow[];
}) {
  if (submissions.length === 0) {
    return (
      <div className="overflow-x-auto rounded-[20px] border border-zk-border bg-zk-surface">
        <p className="px-4 py-8 text-center text-sm text-zk-muted">
          No skill submissions yet.
        </p>
      </div>
    );
  }

  const statusPill = (status: string) => {
    const config: Record<string, string> = {
      pending: "bg-blue-500/10 text-blue-600 border border-blue-500/20",
      approved: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
      rejected: "bg-amber-500/10 text-amber-600 border border-amber-500/20",
    };
    return config[status] ?? config.pending;
  };

  return (
    <div className="overflow-x-auto rounded-[20px] border border-zk-border bg-zk-surface">
      <table className="min-w-full divide-y divide-zk-border text-sm">
        <thead className="bg-zk-tint text-left text-xs font-semibold uppercase tracking-wide text-zk-muted">
          <tr>
            <th className="whitespace-nowrap px-4 py-3">Submission</th>
            <th className="whitespace-nowrap px-4 py-3">Submitted by</th>
            <th className="whitespace-nowrap px-4 py-3">Category</th>
            <th className="whitespace-nowrap px-4 py-3">Bounty</th>
            <th className="whitespace-nowrap px-4 py-3">Status</th>
            <th className="whitespace-nowrap px-4 py-3">Review</th>
            <th className="whitespace-nowrap px-4 py-3">Submitted</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zk-divider">
          {submissions.map((sub) => (
            <tr key={sub.id} className="hover:bg-zk-tint/80">
              <td className="px-4 py-3">
                <div className="min-w-0">
                  <div className="font-medium text-zk-text break-all">{sub.title}</div>
                  <div className="text-xs text-zk-muted">{sub.summary}</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {sub.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="rounded-md bg-zk-chip px-2 py-0.5 text-[10px] font-mono text-zk-text2"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="min-w-0">
                  <div className="font-medium text-zk-text break-all">
                    {sub.submittedBy?.name ?? sub.submittedBy?.email ?? "Unknown"}
                  </div>
                  <div className="text-xs text-zk-muted break-all">
                    {sub.submittedBy?.email ?? ""}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-zk-text2">
                {sub.categoryLabel}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-zk-text2">
                ${sub.bounty}.00
              </td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                    statusPill(sub.status)
                  }`}
                >
                  {sub.status === "pending" ? "Pending" : sub.status === "approved" ? "Approved" : "Rejected"}
                </span>
              </td>
              <td className="px-4 py-3">
                {sub.status === "pending" ? (
                  <div className="space-y-2">
                    <form
                      action={reviewSubmissionFormAction}
                      className="flex items-center gap-2"
                    >
                      <input name="submissionId" value={sub.id} />
                      <input name="status" value="approved" />
                      <button
                        type="submit"
                        className="rounded-md border border-zk-border bg-zk-surface px-3 py-1 text-xs font-semibold text-zk-text hover:bg-zk-tint transition"
                      >
                        Approve
                      </button>
                    </form>
                    <form
                      action={reviewSubmissionFormAction}
                      className="flex items-center gap-2"
                    >
                      <input name="submissionId" value={sub.id} />
                      <input name="status" value="rejected" />
                      <input name="rejectionReason" value="" />
                      <button
                        type="submit"
                        className="rounded-md border border-zk-border bg-zk-surface px-3 py-1 text-xs font-semibold text-zk-text hover:bg-zk-tint transition"
                      >
                        Reject
                      </button>
                    </form>
                  </div>
                ) : sub.status === "approved" ? (
                  <span className="text-[10px] font-semibold text-emerald-600">
                    Reviewed by {sub.reviewedBy?.name ?? "admin"}
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-amber-600">
                    Rejected{sub.rejectionReason ? ` — ${sub.rejectionReason}` : ""}
                  </span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-zk-text2">
                <LocalTime date={sub.createdAt} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
