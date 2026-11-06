"use client";

import { useActionState } from "react";
import { createProjectAction, type ProjectActionResult } from "./actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function CreateProjectForm({
  orgSlug,
}: {
  orgSlug?: string;
}) {
  const [result, action, pending] = useActionState<
    ProjectActionResult | undefined,
    FormData
  >(createProjectAction, undefined);
  const error = result?.error;

  return (
    <form action={action} className="space-y-5" noValidate>
      {orgSlug ? <input type="hidden" name="orgSlug" value={orgSlug} /> : null}

      {error ? (
        <p role="alert" className="rounded-[14px] bg-zk-bad-bg p-3 text-sm text-zk-bad-fg">
          {error}
        </p>
      ) : null}

      {/* Name */}
      <label htmlFor="create-project-name" className="block space-y-1.5 text-sm font-medium text-zk-text">
        <span>Project name <span className="text-zk-bad-fg">*</span></span>
        <Input
          id="create-project-name"
          name="name"
          placeholder="e.g. Web App, Mobile App, Core API"
          minLength={2}
          maxLength={60}
          required
          disabled={pending}
          aria-invalid={result?.field === "name" ? true : undefined}
        />
        {result?.field === "name" ? (
          <span className="text-xs text-zk-bad-fg">{result.fieldErrors?.name ?? result.error}</span>
        ) : null}
      </label>

      {/* Goal */}
      <label htmlFor="create-project-goal" className="block space-y-1.5 text-sm font-medium text-zk-text">
        <span>Goal</span>
        <Textarea
          id="create-project-goal"
          name="goal"
          placeholder="What is this project building? Outline the objectives and scope."
          maxLength={4000}
          rows={4}
          disabled={pending}
          aria-describedby="create-project-goal-hint"
        />
        <span id="create-project-goal-hint" className="block text-xs font-normal text-zk-muted">
          Markdown is supported. Maximum 4,000 characters.
        </span>
      </label>

      {/* GitHub Repo URL */}
      <label htmlFor="create-project-repo" className="block space-y-1.5 text-sm font-medium text-zk-text">
        <span>GitHub repository URL</span>
        <Input
          id="create-project-repo"
          name="repoUrl"
          type="url"
          inputMode="url"
          placeholder="https://github.com/organization/repository"
          disabled={pending}
        />
        {result?.field === "repoUrl" ? (
          <span className="text-xs text-zk-bad-fg">{result.fieldErrors?.repoUrl ?? result.error}</span>
        ) : null}
      </label>

      {/* Site URL and Staging URL */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label htmlFor="create-project-site" className="block space-y-1.5 text-sm font-medium text-zk-text">
          <span>Site URL</span>
          <Input
            id="create-project-site"
            name="siteUrl"
            type="url"
            inputMode="url"
            placeholder="https://example.com"
            disabled={pending}
          />
        </label>
        <label htmlFor="create-project-staging" className="block space-y-1.5 text-sm font-medium text-zk-text">
          <span>Staging URL</span>
          <Input
            id="create-project-staging"
            name="stagingUrl"
            type="url"
            inputMode="url"
            placeholder="https://staging.example.com"
            disabled={pending}
          />
        </label>
      </div>

      {/* Visibility */}
      <div className="space-y-1.5">
        <span className="block text-sm font-medium text-zk-text">Visibility</span>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-zk-border bg-zk-card p-3.5 text-sm text-zk-text transition hover:border-zk-border-hover">
            <input
              type="radio"
              name="visibility"
              value="public"
              defaultChecked
              className="mt-0.5 text-zk-accent focus:ring-zk-accent"
              disabled={pending}
            />
            <div>
              <span className="font-semibold text-zk-text">Public</span>
              <p className="mt-0.5 text-xs text-zk-muted">Discoverable by contributors in the project directory.</p>
            </div>
          </label>
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-zk-border bg-zk-card p-3.5 text-sm text-zk-text transition hover:border-zk-border-hover">
            <input
              type="radio"
              name="visibility"
              value="private"
              className="mt-0.5 text-zk-accent focus:ring-zk-accent"
              disabled={pending}
            />
            <div>
              <span className="font-semibold text-zk-text">Private</span>
              <p className="mt-0.5 text-xs text-zk-muted">Visible only to members of this organization.</p>
            </div>
          </label>
        </div>
      </div>

      {/* Open for collaboration */}
      <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-zk-border bg-zk-card p-3.5 text-sm text-zk-text transition hover:border-zk-border-hover">
        <input
          type="checkbox"
          name="isOpenForContributors"
          defaultChecked
          value="true"
          className="mt-0.5 h-4 w-4 rounded border-zk-border text-zk-accent focus:ring-zk-accent"
          disabled={pending}
        />
        <div>
          <span className="font-semibold text-zk-text">Open for collaboration</span>
          <p className="mt-0.5 text-xs text-zk-muted">
            Allow external developers to browse issues and submit join requests.
          </p>
        </div>
      </label>

      <div className="pt-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-full bg-electric-blue-strong px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
        >
          {pending ? "Creating project…" : "Create project"}
        </button>
      </div>
    </form>
  );
}
