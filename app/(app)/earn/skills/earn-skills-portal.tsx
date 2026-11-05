"use client";

import { useState } from "react";
import Link from "next/link";
import { type SkillCategory } from "@/app/(app)/skills/skills-data";

interface EarnSkillsPortalProps {
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface ContributorSubmission {
  id: string;
  title: string;
  category: SkillCategory;
  categoryLabel: string;
  summary: string;
  status: "pending" | "approved" | "changes_requested";
  submittedAt: string;
}

const CATEGORY_OPTIONS: { id: SkillCategory; label: string }[] = [
  { id: "testing", label: "Testing & QA" },
  { id: "security", label: "Security" },
  { id: "design", label: "Design & UI" },
  { id: "backend", label: "Backend & Database" },
  { id: "marketing", label: "SEO & Marketing" },
];

export function EarnSkillsPortal({ user }: EarnSkillsPortalProps) {
  const [activeTab, setActiveTab] = useState<"submit" | "submissions">("submit");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<SkillCategory>("testing");
  const [summary, setSummary] = useState("");
  const [tags, setTags] = useState("");
  const [prompt, setPrompt] = useState("");
  const [checklist, setChecklist] = useState("");
  const [sampleCommand, setSampleCommand] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Submissions State (seeded with realistic past activities + user additions)
  const [submissions, setSubmissions] = useState<ContributorSubmission[]>([
    {
      id: "sub-1",
      title: "Playwright E2E Browser Inspector",
      category: "testing",
      categoryLabel: "Testing & QA",
      summary: "Automates headless Chromium browser user scenarios and checks console errors.",
      status: "approved",
      submittedAt: "Nov 2, 2026",
    },
    {
      id: "sub-2",
      title: "Snare Security & Clean Gate",
      category: "security",
      categoryLabel: "Security",
      summary: "Pre-flight gatekeeper scanning for disguised payloads and preventing git bloat.",
      status: "approved",
      submittedAt: "Nov 3, 2026",
    },
    {
      id: "sub-3",
      title: "Next.js App Router Hydration Auditor",
      category: "testing",
      categoryLabel: "Testing & QA",
      summary: "Strictly verifies client/server component boundaries and catches hydration mismatches early.",
      status: "pending",
      submittedAt: "Nov 4, 2026",
    },
    {
      id: "sub-4",
      title: "PostgreSQL Schema Index & Query Tuner",
      category: "backend",
      categoryLabel: "Backend & Database",
      summary: "Analyzes foreign key constraints, detects missing composite indexes, and flags table-lock hazards.",
      status: "pending",
      submittedAt: "Nov 5, 2026",
    },
    {
      id: "sub-5",
      title: "Tailwind v4 Token & CSS Variable Extractor",
      category: "design",
      categoryLabel: "Design & UI",
      summary: "Extracts computed CSS design tokens into clean variables. Review requested: add unit tests for fallback tokens.",
      status: "changes_requested",
      submittedAt: "Nov 1, 2026",
    },
  ]);

  const activeCategoryConfig = CATEGORY_OPTIONS.find((c) => c.id === category) || CATEGORY_OPTIONS[0];

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 4000);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !summary.trim() || !prompt.trim()) {
      showToast("Please fill in the title, summary, and agent instructions.");
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const newSubmission: ContributorSubmission = {
        id: `sub-${Date.now()}`,
        title: title.trim(),
        category,
        categoryLabel: activeCategoryConfig.label,
        summary: summary.trim(),
        status: "pending",
        submittedAt: "Just now",
      };

      setSubmissions((prev) => [newSubmission, ...prev]);
      setIsSubmitting(false);

      // Reset form
      setTitle("");
      setSummary("");
      setTags("");
      setPrompt("");
      setChecklist("");
      setSampleCommand("");
      setDocUrl("");

      showToast("Skill submitted successfully! Queued for maintainer review.");
      setActiveTab("submissions");
    }, 450);
  }

  const approvedCount = submissions.filter((s) => s.status === "approved").length;
  const inReviewCount = submissions.filter((s) => s.status === "pending").length;

  return (
    <div className="mx-auto w-full max-w-[1040px] space-y-8 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-zk-border bg-zk-surface px-5 py-3.5 text-sm font-semibold text-zk-text shadow-2xl transition-all"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zk-ok-bg text-zk-ok-fg text-xs font-bold">
            ✓
          </span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Heading & Navigation */}
      <div className="space-y-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <h1 className="text-[28px] md:text-[30px] font-extrabold tracking-[-0.025em] text-zk-text leading-tight">
              Skill Contributions Hub
            </h1>
            <p className="text-sm text-zk-text2 leading-relaxed max-w-[640px]">
              Engineer, test, and publish verified AI agent skills. Once reviewed and accepted by a maintainer, your skill is published to the official catalog.
            </p>
          </div>

          {/* Action Button: Direct sync back to the Skills Library */}
          <Link
            href="/skills"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-zk-border bg-zk-surface px-6 py-2.5 text-sm font-bold text-zk-text shadow-2xs hover:bg-zk-chip hover:text-zk-accent transition active:scale-[0.98] shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <span>View Skills Library</span>
          </Link>
        </div>
      </div>

      {/* Pill Button Tabs */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          onClick={() => setActiveTab("submit")}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition shadow-xs ${
            activeTab === "submit"
              ? "bg-blue-600 text-white"
              : "border border-zk-border bg-zk-surface text-zk-text2 hover:bg-zk-chip"
          }`}
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          <span>Submit a Skill</span>
        </button>

        <button
          onClick={() => setActiveTab("submissions")}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition shadow-xs ${
            activeTab === "submissions"
              ? "bg-blue-600 text-white"
              : "border border-zk-border bg-zk-surface text-zk-text2 hover:bg-zk-chip"
          }`}
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span>My Submissions</span>
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] ${
              activeTab === "submissions" ? "bg-white/25 text-white" : "bg-zk-chip text-zk-muted"
            }`}
          >
            {submissions.length}
          </span>
        </button>
      </div>

      {/* TAB 1: SUBMIT A SKILL */}
      {activeTab === "submit" && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
          {/* Main Form Container */}
          <div className="rounded-[24px] border border-zk-border bg-zk-surface p-7 md:p-8 shadow-xs">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-zk-text">Skill Specification</h2>
                <p className="mt-1 text-xs text-zk-muted leading-relaxed">
                  Provide clear instructions and deterministic assertions so agents can execute this skill reliably.
                </p>
              </div>

              {/* Title & Category Grid */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-zk-text2">
                    Skill Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Next.js App Router Auditor"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-zk-border bg-zk-surface px-3.5 py-2.5 text-sm text-zk-text placeholder-zk-muted focus-visible:outline-2 focus-visible:outline-zk-accent focus-visible:outline-offset-2 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-zk-text2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as SkillCategory)}
                    className="w-full min-h-[44px] rounded-xl border border-zk-border bg-zk-surface px-3.5 py-2.5 text-sm font-semibold text-zk-text focus-visible:outline-2 focus-visible:outline-zk-accent focus-visible:outline-offset-2 transition-all"
                  >
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Short Summary */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-zk-text2">
                  Short Summary <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="One or two sentences explaining what capabilities this skill gives an AI agent..."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full rounded-xl border border-zk-border bg-zk-surface px-3.5 py-2.5 text-sm text-zk-text placeholder-zk-muted focus-visible:outline-2 focus-visible:outline-zk-accent focus-visible:outline-offset-2 leading-relaxed transition-all"
                />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-zk-text2">
                  Tags <span className="text-zk-muted font-normal">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. nextjs, app-router, server-components, audit"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-zk-border bg-zk-surface px-3.5 py-2.5 text-sm text-zk-text placeholder-zk-muted focus-visible:outline-2 focus-visible:outline-zk-accent focus-visible:outline-offset-2 transition-all"
                />
              </div>

              {/* Agent System Instructions (Prompt) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-zk-text2">
                    Agent System Instructions (Prompt) <span className="text-red-500">*</span>
                  </label>
                  <span className="text-xs text-zk-muted">Injected into agent context</span>
                </div>
                <textarea
                  required
                  rows={5}
                  placeholder={`You have the Next.js App Router Auditor skill equipped.
1. Strictly separate client and server boundary declarations.
2. Verify dynamic route segment parameters are safely awaited.
3. Assert zero hydration mismatch warnings during local build.`}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full rounded-xl border border-zk-border bg-zk-chip p-3.5 font-mono text-xs text-zk-text placeholder-zk-muted focus-visible:outline-2 focus-visible:outline-zk-accent focus-visible:outline-offset-2 leading-relaxed transition-all"
                />
              </div>

              {/* Verification Assertions */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-zk-text2">
                  Verification Assertions <span className="text-zk-muted font-normal">(one per line)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder={`Run tsc --noEmit with 0 errors
Verify layout constraints and zero overflow warnings
Confirm passing test suite`}
                  value={checklist}
                  onChange={(e) => setChecklist(e.target.value)}
                  className="w-full rounded-xl border border-zk-border bg-zk-surface px-3.5 py-2.5 text-xs font-mono text-zk-text placeholder-zk-muted focus-visible:outline-2 focus-visible:outline-zk-accent focus-visible:outline-offset-2 leading-relaxed transition-all"
                />
              </div>

              {/* Sample Command & Documentation URL */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-zk-text2">Sample Execution Command</label>
                  <input
                    type="text"
                    placeholder="e.g. npx tsc --noEmit"
                    value={sampleCommand}
                    onChange={(e) => setSampleCommand(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-zk-border bg-zk-surface px-3.5 py-2.5 text-xs font-mono text-zk-text placeholder-zk-muted focus-visible:outline-2 focus-visible:outline-zk-accent focus-visible:outline-offset-2 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-zk-text2">Documentation / Source URL</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={docUrl}
                    onChange={(e) => setDocUrl(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-zk-border bg-zk-surface px-3.5 py-2.5 text-sm text-zk-text placeholder-zk-muted focus-visible:outline-2 focus-visible:outline-zk-accent focus-visible:outline-offset-2 transition-all"
                  />
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-4 flex items-center justify-end border-t border-zk-divider">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-blue-600 px-8 py-3 text-sm font-bold text-white shadow-none transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Submitting...</span>
                  ) : (
                    <>
                      <span>Submit for Review</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="rounded-[20px] border border-zk-border bg-zk-bg p-6 space-y-4">
              <h3 className="text-sm font-bold text-zk-text">Contributor Standards</h3>
              <ul className="space-y-3 text-xs text-zk-text2 leading-relaxed">
                <li className="flex items-start gap-2.5">
                  <span className="text-zk-accent font-bold mt-0.5">•</span>
                  <span><strong>Zero git bloat:</strong> Never include large binary screenshots or vendor artifacts.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-zk-accent font-bold mt-0.5">•</span>
                  <span><strong>Deterministic assertions:</strong> Provide actionable verification steps that can be run automatically.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-zk-accent font-bold mt-0.5">•</span>
                  <span><strong>Originality check:</strong> Review the directory to ensure a duplicate skill does not already exist.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MY SUBMISSIONS */}
      {activeTab === "submissions" && (
        <div className="rounded-[24px] border border-zk-border bg-zk-surface shadow-xs overflow-hidden">
          <div className="border-b border-zk-border bg-zk-chip px-6 py-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-zk-text">
              Your Submitted Skills ({submissions.length})
            </h2>
            <button
              onClick={() => setActiveTab("submit")}
              className="text-xs font-bold text-zk-accent hover:underline"
            >
              + New Submission
            </button>
          </div>

          <div className="divide-y divide-zk-divider">
            {submissions.map((sub) => (
              <div
                key={sub.id}
                className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-zk-bg/50 transition-colors"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zk-accent">
                      {sub.categoryLabel}
                    </span>
                    <span className="text-xs text-zk-muted">•</span>
                    <span className="text-xs text-zk-muted">Submitted {sub.submittedAt}</span>
                  </div>
                  <h3 className="text-sm font-bold text-zk-text">{sub.title}</h3>
                  <p className="text-xs text-zk-text2 max-w-xl leading-relaxed">{sub.summary}</p>
                </div>

                <div className="shrink-0">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                      sub.status === "approved"
                        ? "bg-zk-ok-bg text-zk-ok-fg"
                        : sub.status === "pending"
                        ? "bg-zk-tint text-zk-accent"
                        : "bg-zk-bad-bg text-zk-bad-fg"
                    }`}
                  >
                    {sub.status === "approved"
                      ? "✓ Approved"
                      : sub.status === "pending"
                      ? "⏳ In Review"
                      : "⚠️ Changes Requested"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
