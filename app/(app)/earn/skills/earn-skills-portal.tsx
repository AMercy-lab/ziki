"use client";

import { useState } from "react";
import Link from "next/link";
import { type SkillItem, type SkillCategory } from "@/app/(app)/skills/skills-data";

interface EarnSkillsPortalProps {
  user: {
    id: string;
    name: string;
    email: string;
  };
  verifiedSkills: SkillItem[];
}

interface ContributorSubmission {
  id: string;
  title: string;
  category: SkillCategory;
  categoryLabel: string;
  summary: string;
  bounty: number;
  status: "pending" | "approved" | "changes_requested";
  submittedAt: string;
}

const CATEGORY_OPTIONS: { id: SkillCategory; label: string; defaultBounty: number }[] = [
  { id: "testing", label: "Testing & QA", defaultBounty: 35 },
  { id: "security", label: "Security", defaultBounty: 50 },
  { id: "design", label: "Design & UI", defaultBounty: 30 },
  { id: "backend", label: "Backend & Database", defaultBounty: 45 },
  { id: "marketing", label: "SEO & Marketing", defaultBounty: 40 },
];

export function EarnSkillsPortal({ user, verifiedSkills }: EarnSkillsPortalProps) {
  const [activeTab, setActiveTab] = useState<"submit" | "submissions" | "directory">("submit");
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
      bounty: 35,
      status: "approved",
      submittedAt: "Nov 2, 2026",
    },
    {
      id: "sub-2",
      title: "Snare Security & Clean Gate",
      category: "security",
      categoryLabel: "Security",
      summary: "Pre-flight gatekeeper scanning for disguised payloads and preventing git bloat.",
      bounty: 50,
      status: "approved",
      submittedAt: "Nov 3, 2026",
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
        bounty: activeCategoryConfig.defaultBounty,
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

      showToast("Skill submitted successfully! Queued for Superadmin verification.");
      setActiveTab("submissions");
    }, 450);
  }

  const approvedEarnings = submissions
    .filter((s) => s.status === "approved")
    .reduce((sum, s) => sum + s.bounty, 0);

  const pendingBounties = submissions
    .filter((s) => s.status === "pending")
    .reduce((sum, s) => sum + s.bounty, 0);

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-zk-border bg-zk-surface px-5 py-3.5 text-sm font-semibold text-zk-text shadow-2xl transition-all"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold">
            ✓
          </span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner / Contributor Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between border-b border-zk-border pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="rounded bg-blue-500/10 px-2 py-0.5 text-xs font-bold text-blue-600">
              Contributor Portal
            </span>
            <span className="text-xs text-zk-muted">
              Earned as <strong>{user.name}</strong>
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zk-text sm:text-3xl">
            Skill Bounties & Contributor Hub
          </h1>
          <p className="text-xs text-zk-muted max-w-2xl leading-relaxed">
            Research, engineer, and publish verified agent skills. Once reviewed and accepted by a maintainer, bounties are credited directly to your account.
          </p>
        </div>

        {/* Stats Pill Card */}
        <div className="flex items-center gap-3 rounded-2xl border border-zk-border bg-zk-surface p-2 shadow-xs">
          <div className="px-4 py-2 text-center border-r border-zk-divider">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zk-muted">
              Approved
            </div>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
              ${approvedEarnings}
            </div>
          </div>
          <div className="px-4 py-2 text-center border-r border-zk-divider">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zk-muted">
              In Review
            </div>
            <div className="text-lg font-black text-blue-600">
              ${pendingBounties}
            </div>
          </div>
          <div className="px-4 py-2 text-center">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zk-muted">
              Catalog
            </div>
            <div className="text-lg font-black text-zk-text">
              {verifiedSkills.length} Skills
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zk-border pb-1">
        <button
          onClick={() => setActiveTab("submit")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-bold transition ${
            activeTab === "submit"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-zk-muted hover:text-zk-text"
          }`}
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Submit a Skill</span>
        </button>

        <button
          onClick={() => setActiveTab("submissions")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-bold transition ${
            activeTab === "submissions"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-zk-muted hover:text-zk-text"
          }`}
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span>My Submissions ({submissions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("directory")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-bold transition ${
            activeTab === "directory"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-zk-muted hover:text-zk-text"
          }`}
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          <span>Verified Skills Directory ({verifiedSkills.length})</span>
        </button>
      </div>

      {/* TAB 1: SUBMIT A SKILL FORM */}
      {activeTab === "submit" && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <form onSubmit={handleSubmit} className="space-y-6 lg:col-span-2">
            <div className="rounded-2xl border border-zk-border bg-zk-surface p-6 shadow-sm space-y-5">
              <h2 className="text-base font-bold text-zk-text">
                Skill Specification
              </h2>

              {/* Title & Category Row */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zk-text">
                    Skill Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Next.js App Router Auditor"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-xl border border-zk-border bg-zk-surface px-3 py-2 text-xs font-medium text-zk-text placeholder-zk-muted focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zk-text">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as SkillCategory)}
                    className="w-full rounded-xl border border-zk-border bg-zk-surface px-3 py-2 text-xs font-semibold text-zk-text focus:border-blue-600 focus:outline-none"
                  >
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label} (${opt.defaultBounty} bounty)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Summary Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zk-text">
                  Short Summary <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="One or two sentences explaining what capabilities this skill gives an AI agent..."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full rounded-xl border border-zk-border bg-zk-surface px-3 py-2 text-xs font-medium text-zk-text placeholder-zk-muted focus:border-blue-600 focus:outline-none leading-relaxed"
                />
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zk-text">
                  Tags <span className="text-zk-muted font-normal">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. nextjs, app-router, server-components, audit"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full rounded-xl border border-zk-border bg-zk-surface px-3 py-2 text-xs font-medium text-zk-text placeholder-zk-muted focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* Agent System Instructions (Prompt) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zk-text">
                    Agent System Instructions (Prompt) <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-zk-muted">
                    Injected into agent context upon equip
                  </span>
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
                  className="w-full rounded-xl border border-zk-border bg-zk-chip p-3 font-mono text-xs text-zk-text placeholder-zk-muted focus:border-blue-600 focus:outline-none leading-relaxed"
                />
              </div>

              {/* Verification Checklist */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zk-text">
                  Verification Assertions <span className="text-zk-muted font-normal">(one per line)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder={`Run tsc --noEmit with 0 errors
Verify layout constraints and zero overflow warnings
Confirm passing test suite`}
                  value={checklist}
                  onChange={(e) => setChecklist(e.target.value)}
                  className="w-full rounded-xl border border-zk-border bg-zk-surface px-3 py-2 text-xs font-mono text-zk-text placeholder-zk-muted focus:border-blue-600 focus:outline-none leading-relaxed"
                />
              </div>

              {/* Sample Command & Documentation URL */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zk-text">Sample Command</label>
                  <input
                    type="text"
                    placeholder="e.g. npx tsc --noEmit"
                    value={sampleCommand}
                    onChange={(e) => setSampleCommand(e.target.value)}
                    className="w-full rounded-xl border border-zk-border bg-zk-surface px-3 py-2 text-xs font-mono text-zk-text placeholder-zk-muted focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zk-text">Documentation / Source URL</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={docUrl}
                    onChange={(e) => setDocUrl(e.target.value)}
                    className="w-full rounded-xl border border-zk-border bg-zk-surface px-3 py-2 text-xs font-medium text-zk-text placeholder-zk-muted focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-2 flex items-center justify-between border-t border-zk-divider">
                <div className="text-xs text-zk-muted">
                  Bounty for {activeCategoryConfig.label}:{" "}
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    ${activeCategoryConfig.defaultBounty}.00
                  </strong>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Submitting...</span>
                  ) : (
                    <>
                      <span>Submit for Review</span>
                      <span className="font-mono">→</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Guidelines & Bounty Rules Sidebar */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-zk-border bg-zk-surface p-5 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold text-zk-text">Contributor Guidelines</h3>
              <ul className="space-y-2.5 text-xs text-zk-muted leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span><strong>Zero git bloat:</strong> Never include large binary screenshots or vendor dumps.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span><strong>Deterministic assertions:</strong> Provide actionable verification steps that can be automated.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span><strong>Originality check:</strong> Review the verified directory to make sure a duplicate skill doesn't already exist.</span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-zk-border bg-zk-chip p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zk-text">
                Bounty Payout Schedule
              </h3>
              <div className="space-y-2 text-xs">
                {CATEGORY_OPTIONS.map((cat) => (
                  <div key={cat.id} className="flex justify-between items-center text-zk-muted">
                    <span>{cat.label}</span>
                    <span className="font-bold text-zk-text">${cat.defaultBounty}.00</span>
                  </div>
                ))}
              </div>
              <p className="pt-2 text-[11px] text-zk-muted leading-relaxed border-t border-zk-border">
                Approved submissions are credited to your account within 24 hours of maintainer review.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MY SUBMISSIONS */}
      {activeTab === "submissions" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-zk-border bg-zk-surface shadow-sm overflow-hidden">
            <div className="border-b border-zk-border bg-zk-chip px-5 py-3 text-xs font-bold text-zk-text flex items-center justify-between">
              <span>Your Submitted Skills ({submissions.length})</span>
              <button
                onClick={() => setActiveTab("submit")}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                + New Submission
              </button>
            </div>

            <div className="divide-y divide-zk-border">
              {submissions.map((sub) => (
                <div key={sub.id} className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                        {sub.categoryLabel}
                      </span>
                      <span className="text-xs text-zk-muted">•</span>
                      <span className="text-xs text-zk-muted">Submitted {sub.submittedAt}</span>
                    </div>
                    <h3 className="text-sm font-bold text-zk-text">{sub.title}</h3>
                    <p className="text-xs text-zk-muted max-w-xl">{sub.summary}</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-extrabold text-zk-text">${sub.bounty}.00</div>
                      <div className="text-[10px] text-zk-muted uppercase font-semibold">Bounty</div>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        sub.status === "approved"
                          ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                          : sub.status === "pending"
                          ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                          : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
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
        </div>
      )}

      {/* TAB 3: VERIFIED SKILLS DIRECTORY PREVIEW */}
      {activeTab === "directory" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-zk-text">Existing Verified Skills</h2>
              <p className="text-xs text-zk-muted">
                Browse skills already in the catalog before building a new submission.
              </p>
            </div>
            <Link
              href="/skills"
              className="rounded-xl border border-zk-border bg-zk-chip px-3 py-1.5 text-xs font-bold text-zk-text hover:bg-zk-border transition"
            >
              Open Full Skills Library ↗
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {verifiedSkills.map((sk) => (
              <div
                key={sk.id}
                className="rounded-2xl border border-zk-border bg-zk-surface p-5 space-y-2.5 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                    {sk.categoryLabel}
                  </span>
                  <span className="rounded bg-zk-chip px-2 py-0.5 text-[10px] font-bold text-zk-text2">
                    {sk.badge}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-zk-text">
                  <Link href={`/skills/${sk.slug}`} className="hover:text-blue-600 transition">
                    {sk.title}
                  </Link>
                </h3>
                <p className="text-xs text-zk-muted line-clamp-2 leading-relaxed">
                  {sk.description}
                </p>
                <div className="pt-2 border-t border-zk-divider flex items-center justify-between text-[11px] text-zk-muted">
                  <span>{sk.usersCount} agents equipped</span>
                  <Link href={`/skills/${sk.slug}`} className="font-semibold text-blue-600 hover:underline">
                    View Spec →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
