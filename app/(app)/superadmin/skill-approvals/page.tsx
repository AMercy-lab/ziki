import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { LocalTime } from "@/components/local-time";
import { Avatar } from "@/components/avatar";
import { reviewSubmissionFormAction } from "@/app/actions/skill-submissions";

export const metadata = { title: "Skill Approvals" };

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
      prompt: true,
      sampleCommand: true,
      documentationUrl: true,
      status: true,
      rejectionReason: true,
      reviewedAt: true,
      createdAt: true,
      submittedBy: { select: { id: true, name: true, email: true, image: true } },
      reviewedBy: { select: { id: true, name: true, email: true } },
    },
  });
}

type SkillSubmissionRow = Awaited<ReturnType<typeof fetchSkillSubmissions>>[number];

export default async function SkillApprovalsPage() {
  await requireSuperAdmin();
  const submissions = await fetchSkillSubmissions();

  const pendingCount = submissions.filter((s) => s.status === "pending").length;
  const approvedCount = submissions.filter((s) => s.status === "approved").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-zk-text sm:text-2xl">Skill Approvals</h1>
            {pendingCount > 0 && (
              <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-600 border border-blue-500/20">
                {pendingCount} pending
              </span>
            )}
          </div>
          <p className="mt-1 max-w-2xl text-sm text-zk-text2">
            Review, verify, and approve community-submitted agent skills before publishing them to the public skills library.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/skills"
            className="rounded-xl border border-zk-border bg-zk-surface px-4 py-2 text-xs font-semibold text-zk-text hover:bg-zk-tint transition"
          >
            View Public Library
          </Link>
          <Link
            href="/earn/skills"
            className="rounded-xl bg-zk-accent px-4 py-2 text-xs font-semibold text-white hover:bg-zk-accent/90 transition shadow-sm"
          >
            + Submit Skill
          </Link>
        </div>
      </div>

      {/* Submissions Table */}
      {submissions.length === 0 ? (
        <div className="rounded-[20px] border border-zk-border bg-zk-surface p-12 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-zk-chip text-zk-muted">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <h2 className="mt-4 text-base font-semibold text-zk-text">No skill submissions waiting</h2>
          <p className="mt-1 text-sm text-zk-muted">
            When contributors submit new skill specifications via the Contributor Portal, they will appear here for review.
          </p>
          <div className="mt-5">
            <Link
              href="/earn/skills"
              className="inline-flex items-center gap-2 rounded-xl bg-zk-accent px-4 py-2 text-xs font-semibold text-white hover:bg-zk-accent/90 transition"
            >
              Submit a Skill
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[20px] border border-zk-border bg-zk-surface shadow-sm">
          <table className="min-w-full divide-y divide-zk-border text-sm">
            <thead className="bg-zk-tint text-left text-xs font-semibold uppercase tracking-wide text-zk-muted">
              <tr>
                <th className="whitespace-nowrap px-4 py-3">Skill Specification</th>
                <th className="whitespace-nowrap px-4 py-3">Submitted By</th>
                <th className="whitespace-nowrap px-4 py-3">Category</th>
                <th className="whitespace-nowrap px-4 py-3">Status</th>
                <th className="whitespace-nowrap px-4 py-3">Actions</th>
                <th className="whitespace-nowrap px-4 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zk-divider">
              {submissions.map((sub) => {
                const tagsList = Array.isArray(sub.tags) ? (sub.tags as string[]) : [];
                return (
                  <tr key={sub.id} className="hover:bg-zk-tint/60 transition-colors">
                    {/* Title & Summary */}
                    <td className="px-4 py-3 max-w-[340px]">
                      <div className="min-w-0">
                        <div className="font-semibold text-zk-text break-words">{sub.title}</div>
                        <div className="text-xs text-zk-muted line-clamp-2 mt-0.5">{sub.summary}</div>
                        {tagsList.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {tagsList.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-md bg-zk-chip px-2 py-0.5 text-[10px] font-mono text-zk-text2"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Author */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={sub.submittedBy?.name} image={sub.submittedBy?.image} size="sm" />
                        <div className="min-w-0">
                          <div className="font-medium text-zk-text text-xs">
                            {sub.submittedBy?.name ?? "Community Contributor"}
                          </div>
                          <div className="text-[11px] text-zk-muted">
                            {sub.submittedBy?.email ?? ""}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="rounded-lg bg-zk-chip px-2.5 py-1 text-xs font-medium text-zk-text">
                        {sub.categoryLabel || sub.category}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                          sub.status === "approved"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : sub.status === "rejected"
                              ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                              : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            sub.status === "approved"
                              ? "bg-emerald-500"
                              : sub.status === "rejected"
                                ? "bg-amber-500"
                                : "bg-blue-500"
                          }`}
                        />
                        {sub.status === "approved"
                          ? "Approved"
                          : sub.status === "rejected"
                            ? "Changes Requested"
                            : "Pending Review"}
                      </span>
                    </td>

                    {/* Review Actions */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {sub.status === "pending" ? (
                        <div className="flex items-center gap-2">
                          <form action={reviewSubmissionFormAction}>
                            <input type="hidden" name="submissionId" value={sub.id} />
                            <input type="hidden" name="status" value="approved" />
                            <button
                              type="submit"
                              className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 transition shadow-sm"
                            >
                              Approve
                            </button>
                          </form>
                          <form action={reviewSubmissionFormAction}>
                            <input type="hidden" name="submissionId" value={sub.id} />
                            <input type="hidden" name="status" value="rejected" />
                            <button
                              type="submit"
                              className="rounded-lg border border-zk-border bg-zk-surface px-3 py-1 text-xs font-semibold text-zk-muted hover:text-zk-text hover:bg-zk-tint transition"
                            >
                              Reject
                            </button>
                          </form>
                        </div>
                      ) : sub.status === "approved" ? (
                        <div className="text-xs text-zk-muted">
                          <span className="font-semibold text-emerald-600">✓ Published</span>
                          {sub.reviewedBy?.name && <span> · by {sub.reviewedBy.name}</span>}
                        </div>
                      ) : (
                        <div className="text-xs text-amber-600">
                          <span>Rejected</span>
                          {sub.rejectionReason && <span className="text-zk-muted"> · {sub.rejectionReason}</span>}
                        </div>
                      )}
                    </td>

                    {/* Submission Date */}
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-zk-text2">
                      <LocalTime date={sub.createdAt} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
