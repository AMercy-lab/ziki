"use client";

import { useState, useActionState } from "react";
import { updateProjectAction } from "@/app/(app)/projects/actions";
import type { ProjectActionResult } from "@/app/(app)/projects/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ProjectRewardRulesSection } from "@/components/project-reward-rules-section";
import type { ProjectRewardConfig } from "@/lib/points/project-rewards";

type Project = {
  slug: string;
  name: string;
  goal: string | null;
  repoUrl: string | null;
  stagingUrl: string | null;
  siteUrl: string | null;
  rewardConfig?: unknown;
};

export function ProjectSettingsForm({
  project,
  defaults = null,
}: {
  project: Project;
  defaults?: ProjectRewardConfig | null;
}) {
  const [result, action, pending] = useActionState<ProjectActionResult | undefined, FormData>(updateProjectAction, undefined);
  const [showTechnical, setShowTechnical] = useState(false);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="slug" value={project.slug} />
      {result?.error ? (
        <p role="alert" className="rounded-xl bg-zk-bad-bg p-3 text-sm text-zk-bad-fg">
          {result.error}
        </p>
      ) : null}

      {/* Primary Essential Info */}
      <div className="space-y-4">
        <div>
          <label htmlFor="project-name" className="block text-sm font-semibold text-zk-text">
            Project Name
          </label>
          <p className="mt-0.5 text-xs text-zk-muted">The name your team and agents see.</p>
          <div className="mt-1.5">
            <Input
              id="project-name"
              name="name"
              defaultValue={project.name}
              minLength={2}
              maxLength={60}
              required
              className="max-w-md"
            />
          </div>
          {result?.field === "name" ? (
            <span className="text-xs text-zk-bad-fg">{result.fieldErrors?.name ?? result.error}</span>
          ) : null}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="project-goal" className="block text-sm font-semibold text-zk-text">
              Project Brief &amp; Context for Agents
            </label>
            <span className="text-xs text-zk-muted">Markdown supported</span>
          </div>
          <p className="mt-0.5 text-xs text-zk-muted">
            Explain what this project is building, who it is for, and how the final product should work. Agents read this context whenever they solve issues so they don&apos;t build in the wrong direction.
          </p>
          <div className="mt-1.5">
            <Textarea
              id="project-goal"
              name="goal"
              defaultValue={project.goal ?? ""}
              maxLength={4000}
              rows={5}
              placeholder="e.g. A fast checkout app for retail store managers. Focus on minimal steps, offline support, and clean mobile UX..."
              className="w-full text-sm leading-relaxed"
            />
          </div>
        </div>

        <div>
          <label htmlFor="project-site-url" className="block text-sm font-semibold text-zk-text">
            Live Website URL <span className="text-xs font-normal text-zk-muted">(optional)</span>
          </label>
          <p className="mt-0.5 text-xs text-zk-muted">Your public site or web app address.</p>
          <div className="mt-1.5">
            <Input
              id="project-site-url"
              name="siteUrl"
              type="url"
              inputMode="url"
              placeholder="https://example.com"
              defaultValue={project.siteUrl ?? ""}
              className="max-w-md"
            />
          </div>
          {result?.field === "siteUrl" ? (
            <span className="text-xs text-zk-bad-fg">{result.fieldErrors?.siteUrl ?? result.error}</span>
          ) : null}
        </div>
      </div>

      {/* Advanced / Developer Links Toggle */}
      <div className="rounded-xl border border-zk-border/60 bg-zk-subtle/30 p-4">
        <button
          type="button"
          onClick={() => setShowTechnical(!showTechnical)}
          className="flex w-full items-center justify-between text-left text-sm font-medium text-zk-text"
        >
          <div className="flex items-center gap-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`text-zk-muted transition-transform duration-200 ${showTechnical ? "rotate-90" : ""}`}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span>Developer Links &amp; Staging (Advanced)</span>
          </div>
          <span className="text-xs text-zk-accent font-normal">
            {showTechnical ? "Hide" : "Show options"}
          </span>
        </button>

        {showTechnical && (
          <div className="mt-4 space-y-4 border-t border-zk-border/60 pt-4">
            <div>
              <label htmlFor="project-repo-url" className="block text-xs font-semibold text-zk-text">
                GitHub Repository URL
              </label>
              <p className="mt-0.5 text-xs text-zk-muted">Link where project code is hosted.</p>
              <div className="mt-1">
                <Input
                  id="project-repo-url"
                  name="repoUrl"
                  type="url"
                  inputMode="url"
                  placeholder="https://github.com/owner/repository"
                  defaultValue={project.repoUrl ?? ""}
                />
              </div>
              {result?.field === "repoUrl" ? (
                <span className="text-xs text-zk-bad-fg">{result.fieldErrors?.repoUrl ?? result.error}</span>
              ) : null}
            </div>

            <div>
              <label htmlFor="project-staging-url" className="block text-xs font-semibold text-zk-text">
                Staging Environment URL
              </label>
              <p className="mt-0.5 text-xs text-zk-muted">URL for testing candidate fixes before production.</p>
              <div className="mt-1">
                <Input
                  id="project-staging-url"
                  name="stagingUrl"
                  type="url"
                  inputMode="url"
                  placeholder="https://staging.example.com"
                  defaultValue={project.stagingUrl ?? ""}
                />
              </div>
              {result?.field === "stagingUrl" ? (
                <span className="text-xs text-zk-bad-fg">{result.fieldErrors?.stagingUrl ?? result.error}</span>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <ProjectRewardRulesSection
        initialConfig={project.rewardConfig as ProjectRewardConfig | null}
        defaults={defaults}
        disabled={pending}
      />

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save Changes"}
        </Button>
        {result && !result.error ? (
          <span role="status" className="text-sm font-medium text-zk-ok-fg">
            ✓ Changes saved successfully.
          </span>
        ) : null}
      </div>
    </form>
  );
}
