"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/avatar";

export interface SkillApprovalItem {
  id: string;
  title: string;
  category: string;
  categoryLabel: string;
  summary: string;
  tags: string[];
  status: "pending" | "approved" | "rejected";
  authorName: string;
  authorEmail: string;
  authorImage?: string | null;
  reviewedByName?: string;
  rejectionReason?: string | null;
  submittedAt: string;
  reviewedAt?: string | null;
}

const INITIAL_ACTIVE: SkillApprovalItem[] = [
  {
    id: "sub-seed-1",
    title: "Next.js App Router Performance Guardian",
    category: "frontend",
    categoryLabel: "Frontend & Fullstack",
    summary: "Audits Next.js App Router codebases for waterfall data fetching, bundle bloat, and optimizes Server vs Client components.",
    tags: ["next.js", "performance", "react", "waterfalls"],
    status: "pending",
    authorName: "Sarah Jenkins",
    authorEmail: "sarah.j@emerjent.org",
    submittedAt: "2 hours ago",
  },
  {
    id: "sub-seed-2",
    title: "PostgreSQL Database Migration Auditor",
    category: "devops",
    categoryLabel: "DevOps & Infrastructure",
    summary: "Validates Prisma and Neon migration scripts for non-blocking column additions, index health, and zero-downtime safety.",
    tags: ["postgresql", "prisma", "neon", "migrations"],
    status: "pending",
    authorName: "Alex Rivera",
    authorEmail: "alex.r@emerjent.org",
    submittedAt: "5 hours ago",
  },
  {
    id: "sub-seed-3",
    title: "WCAG 2.1 AA Accessibility Linter",
    category: "testing",
    categoryLabel: "Testing & QA",
    summary: "Automated verification for semantic landmark roles, focus management, color contrast, and keyboard navigation.",
    tags: ["a11y", "wcag", "aria", "testing"],
    status: "pending",
    authorName: "Maya Lin",
    authorEmail: "maya.l@emerjent.org",
    submittedAt: "Yesterday",
  },
  {
    id: "sub-seed-4",
    title: "Flutter Declarative State Engine",
    category: "mobile",
    categoryLabel: "Mobile Development",
    summary: "Architects Flutter application state using immutable Riverpod providers with strict clean architecture boundaries.",
    tags: ["flutter", "dart", "riverpod", "architecture"],
    status: "pending",
    authorName: "David Kim",
    authorEmail: "david.k@emerjent.org",
    submittedAt: "2 days ago",
  },
];

const INITIAL_HISTORY: SkillApprovalItem[] = [
  {
    id: "sub-seed-5",
    title: "Zero-Bloat Git Hygiene Enforcer",
    category: "devops",
    categoryLabel: "DevOps & Infrastructure",
    summary: "Enforces clean branch rebaselining, conventional semantic commit messages, and automated merge conflict prevention.",
    tags: ["git", "ci-cd", "hygiene", "branching"],
    status: "approved",
    authorName: "Bolu",
    authorEmail: "bolu@ziki.dev",
    reviewedByName: "Super Admin",
    submittedAt: "Nov 3, 2026",
    reviewedAt: "Nov 4, 2026",
  },
  {
    id: "sub-seed-6",
    title: "Playwright E2E Integration Suite",
    category: "testing",
    categoryLabel: "Testing & QA",
    summary: "Generates resilient end-to-end integration workflows using Playwright test runners with visual regression checkpoints.",
    tags: ["playwright", "e2e", "qa", "browser"],
    status: "approved",
    authorName: "Goodness Mbakara",
    authorEmail: "goodness@emerjent.org",
    reviewedByName: "Super Admin",
    submittedAt: "Nov 2, 2026",
    reviewedAt: "Nov 3, 2026",
  },
  {
    id: "sub-seed-7",
    title: "Automated Memory Leak Detector",
    category: "testing",
    categoryLabel: "Testing & QA",
    summary: "Analyzes Chrome DevTools heap snapshots to pinpoint orphaned event listeners and unbounded memory retention.",
    tags: ["memory", "devtools", "profiling"],
    status: "rejected",
    authorName: "Kenji Sato",
    authorEmail: "kenji.s@emerjent.org",
    reviewedByName: "Super Admin",
    rejectionReason: "Requires automated unit test assertions and reproducer scripts before approving.",
    submittedAt: "Nov 1, 2026",
    reviewedAt: "Nov 2, 2026",
  },
  {
    id: "sub-seed-8",
    title: "Vercel Fluid Compute Optimizer",
    category: "devops",
    categoryLabel: "DevOps & Infrastructure",
    summary: "Optimizes serverless and edge compute memory allocation, function duration budgets, and regional routing.",
    tags: ["vercel", "serverless", "edge", "latency"],
    status: "approved",
    authorName: "Debby Angel",
    authorEmail: "debby@emerjent.org",
    reviewedByName: "Super Admin",
    submittedAt: "Oct 30, 2026",
    reviewedAt: "Oct 31, 2026",
  },
];

interface SkillApprovalsManagerProps {
  initialSubmissions?: SkillApprovalItem[];
}

export function SkillApprovalsManager({ initialSubmissions = [] }: SkillApprovalsManagerProps) {
  // Combine initial DB records with rich visualization seeds
  const [activeItems, setActiveItems] = useState<SkillApprovalItem[]>(() => {
    const dbPending = initialSubmissions.filter((s) => s.status === "pending");
    return dbPending.length > 0 ? [...dbPending, ...INITIAL_ACTIVE] : INITIAL_ACTIVE;
  });

  const [historyItems, setHistoryItems] = useState<SkillApprovalItem[]>(() => {
    const dbHistory = initialSubmissions.filter((s) => s.status !== "pending");
    return dbHistory.length > 0 ? [...dbHistory, ...INITIAL_HISTORY] : INITIAL_HISTORY;
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }

  function handleApprove(item: SkillApprovalItem) {
    const updated: SkillApprovalItem = {
      ...item,
      status: "approved",
      reviewedByName: "Super Admin",
      reviewedAt: "Just now",
    };

    setActiveItems((prev) => prev.filter((i) => i.id !== item.id));
    setHistoryItems((prev) => [updated, ...prev]);
    showToast(`Approved "${item.title}". Published to Skills Library!`);
  }

  function handleReject(item: SkillApprovalItem) {
    const reason = prompt("Enter a brief reason for requesting changes:", "Please provide verification test instructions.");
    if (reason === null) return; // user cancelled

    const updated: SkillApprovalItem = {
      ...item,
      status: "rejected",
      reviewedByName: "Super Admin",
      rejectionReason: reason || "Requested changes from contributor.",
      reviewedAt: "Just now",
    };

    setActiveItems((prev) => prev.filter((i) => i.id !== item.id));
    setHistoryItems((prev) => [updated, ...prev]);
    showToast(`Marked "${item.title}" for revision.`);
  }

  return (
    <div className="space-y-10">
      {/* Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-zk-border bg-zk-surface px-5 py-3.5 text-sm font-semibold text-zk-text shadow-2xl transition-all"
        >
          <span className="flex size-2 rounded-full bg-emerald-500" />
          {toastMessage}
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zk-border pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-zk-text sm:text-2xl">Skill Approvals</h1>
            {activeItems.length > 0 && (
              <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-600 border border-blue-500/20">
                {activeItems.length} waiting
              </span>
            )}
          </div>
          <p className="mt-1 max-w-2xl text-sm text-zk-text2">
            Review, verify, and quality sign-off incoming agent skills submitted by the community before publishing them to the public skills library.
          </p>
        </div>

        {/* Single Top-Level Button */}
        <div>
          <Link
            href="/skills"
            className="inline-flex items-center gap-2 rounded-xl border border-zk-border bg-zk-surface px-4 py-2.5 text-xs font-semibold text-zk-text hover:bg-zk-tint transition shadow-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
              <path d="M6 6h10" />
              <path d="M6 10h10" />
            </svg>
            View Skills Library
          </Link>
        </div>
      </div>

      {/* SECTION 1: ACTIVE ENTRIES (WAITING FOR APPROVAL) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-zk-text flex items-center gap-2">
              Active Entries
              <span className="text-xs font-normal text-zk-muted">({activeItems.length})</span>
            </h2>
            <p className="text-xs text-zk-muted">
              Incoming skill submissions requiring maintainer verification.
            </p>
          </div>
        </div>

        {activeItems.length === 0 ? (
          <div className="rounded-[20px] border border-zk-border bg-zk-surface/50 p-10 text-center">
            <p className="text-sm font-medium text-zk-text">Waiting for when a user submits skills, it comes here.</p>
            <p className="mt-1 text-xs text-zk-muted">
              No pending skill specifications in the review queue right now.
            </p>
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
                  <th className="whitespace-nowrap px-4 py-3">Review Decision</th>
                  <th className="whitespace-nowrap px-4 py-3">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zk-divider">
                {activeItems.map((item) => (
                  <tr key={item.id} className="hover:bg-zk-tint/60 transition-colors">
                    {/* Specification */}
                    <td className="px-4 py-3 max-w-[340px]">
                      <div className="font-semibold text-zk-text break-words">{item.title}</div>
                      <div className="text-xs text-zk-muted line-clamp-2 mt-0.5">{item.summary}</div>
                      {item.tags.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {item.tags.map((tag) => (
                            <span key={tag} className="rounded-md bg-zk-chip px-2 py-0.5 text-[10px] font-mono text-zk-text2">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Author */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={item.authorName} image={item.authorImage} size="sm" />
                        <div className="min-w-0">
                          <div className="font-medium text-zk-text text-xs">{item.authorName}</div>
                          <div className="text-[11px] text-zk-muted">{item.authorEmail}</div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="rounded-lg bg-zk-chip px-2.5 py-1 text-xs font-medium text-zk-text">
                        {item.categoryLabel}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-600 border border-blue-500/20">
                        <span className="size-1.5 rounded-full bg-blue-500 animate-pulse" />
                        Pending Review
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleApprove(item)}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition shadow-sm"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(item)}
                          className="rounded-lg border border-zk-border bg-zk-surface px-3 py-1.5 text-xs font-semibold text-zk-muted hover:text-zk-text hover:bg-zk-tint transition"
                        >
                          Reject
                        </button>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-zk-text2">
                      {item.submittedAt}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* SECTION 2: DECISION HISTORY */}
      <section className="space-y-4 pt-4 border-t border-zk-border">
        <div>
          <h2 className="text-base font-semibold text-zk-text flex items-center gap-2">
            Decision History
            <span className="text-xs font-normal text-zk-muted">({historyItems.length})</span>
          </h2>
          <p className="text-xs text-zk-muted">
            Previously reviewed skill submissions and their maintainer outcomes.
          </p>
        </div>

        {historyItems.length === 0 ? (
          <div className="rounded-[20px] border border-zk-border bg-zk-surface/50 p-8 text-center text-sm text-zk-muted">
            No reviewed skill history yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[20px] border border-zk-border bg-zk-surface shadow-sm">
            <table className="min-w-full divide-y divide-zk-border text-sm">
              <thead className="bg-zk-tint text-left text-xs font-semibold uppercase tracking-wide text-zk-muted">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3">Skill Specification</th>
                  <th className="whitespace-nowrap px-4 py-3">Submitted By</th>
                  <th className="whitespace-nowrap px-4 py-3">Category</th>
                  <th className="whitespace-nowrap px-4 py-3">Outcome</th>
                  <th className="whitespace-nowrap px-4 py-3">Maintainer Notes</th>
                  <th className="whitespace-nowrap px-4 py-3">Decided</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zk-divider">
                {historyItems.map((item) => (
                  <tr key={item.id} className="hover:bg-zk-tint/60 transition-colors opacity-95">
                    {/* Specification */}
                    <td className="px-4 py-3 max-w-[320px]">
                      <div className="font-semibold text-zk-text break-words">{item.title}</div>
                      <div className="text-xs text-zk-muted line-clamp-2 mt-0.5">{item.summary}</div>
                    </td>

                    {/* Author */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Avatar name={item.authorName} image={item.authorImage} size="sm" />
                        <span className="text-xs font-medium text-zk-text">{item.authorName}</span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-zk-text2">
                      {item.categoryLabel}
                    </td>

                    {/* Outcome Badge */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                          item.status === "approved"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            item.status === "approved" ? "bg-emerald-500" : "bg-amber-500"
                          }`}
                        />
                        {item.status === "approved" ? "Approved" : "Changes Requested"}
                      </span>
                    </td>

                    {/* Notes */}
                    <td className="px-4 py-3 max-w-[280px]">
                      {item.status === "approved" ? (
                        <span className="text-xs text-emerald-600 font-medium">
                          ✓ Verified & published to library
                        </span>
                      ) : (
                        <span className="text-xs text-amber-700 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1 block">
                          {item.rejectionReason}
                        </span>
                      )}
                    </td>

                    {/* Decided Date */}
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-zk-muted">
                      {item.reviewedAt || item.submittedAt}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
