"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { selectTenantAction } from "@/app/(app)/tenants/actions";
import { avatarTone } from "@/lib/avatar";
import { orgHomePath, projectPath, projectRef } from "@/lib/project-paths";

/** A workspace's mark: its initial on a soft tile, the same colour every time for the same name. */
function WorkspaceMark({ name, size = "sm" }: { name: string; size?: "sm" | "xs" }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center font-bold ${avatarTone(name)} ${
        size === "sm" ? "h-6 w-6 rounded-[7px] text-[12px]" : "h-5 w-5 rounded-md text-[10.5px]"
      }`}
    >
      {initial}
    </span>
  );
}

export type WorkspaceProject = {
  id: string;
  name: string;
  slug: string;
};

/** A workspace the viewer belongs to and can open from the header. */
export type WorkspaceChoice = {
  id: string;
  name: string;
  slug: string;
  projects?: WorkspaceProject[];
};

export type ExternalProjectChoice = {
  id: string;
  name: string;
  slug: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
};

function visibleName(workspace: WorkspaceChoice, shared: boolean): string {
  return shared ? `${workspace.name} (${workspace.slug})` : workspace.name;
}

/**
 * The active workspace in the header. Restores the clean, compact design
 * while staying route-aware for two-tier (/<org>/<project>) addresses.
 */
export function WorkspaceSwitcher({
  workspaces,
  activeTenantId,
  externalProjects = [],
  className = "",
  fullWidth = false,
  tone = "default",
  canManage = false,
  orgHref = null,
}: {
  workspaces: WorkspaceChoice[];
  activeTenantId: string | null;
  externalProjects?: ExternalProjectChoice[];
  canManage?: boolean;
  orgHref?: string | null;
  className?: string;
  fullWidth?: boolean;
  tone?: "default" | "chrome" | "bar";
}) {
  const chrome = tone === "chrome";
  const bar = tone === "bar";
  const listId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const params = useParams<{ org?: string; project?: string }>();
  const currentOrgSlug = params?.org ? decodeURIComponent(params.org) : null;

  const counts = new Map<string, number>();
  for (const workspace of workspaces) {
    const key = workspace.name.toLocaleLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const shared = (name: string) => (counts.get(name.toLocaleLowerCase()) ?? 0) > 1;

  const externalOrg = currentOrgSlug
    ? externalProjects.find((p) => p.tenantSlug === currentOrgSlug)
    : null;

  const selected: WorkspaceChoice | undefined =
    (currentOrgSlug ? workspaces.find((w) => w.slug === currentOrgSlug) : null) ??
    (externalOrg
      ? {
          id: externalOrg.tenantId,
          name: externalOrg.tenantName,
          slug: externalOrg.tenantSlug,
          projects: externalProjects
            .filter((p) => p.tenantSlug === externalOrg.tenantSlug)
            .map((p) => ({ id: p.id, name: p.name, slug: p.slug })),
        }
      : null) ??
    workspaces.find((workspace) => workspace.id === activeTenantId) ??
    workspaces[0];

  const isExternalSelected = Boolean(selected && !workspaces.some((w) => w.id === selected.id));
  const contributedProjects = isExternalSelected
    ? externalProjects.filter((p) => p.tenantSlug !== selected?.slug)
    : externalProjects;

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!selected) {
    return (
      <Link
        href="/tenants"
        className={`inline-flex h-8 items-center rounded-lg px-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 ${
          fullWidth ? "w-full" : ""
        } ${className}`}
      >
        Workspaces
      </Link>
    );
  }

  const selectedLabel = visibleName(selected, shared(selected.name));

  function choose(id: string) {
    setOpen(false);
    if (id === selected?.id) return;
    const form = formRef.current;
    const input = form?.elements.namedItem("tenantId");
    if (!form || !(input instanceof HTMLInputElement)) return;
    input.value = id;
    form.requestSubmit();
  }

  const primaryOrgTarget =
    selected?.slug === currentOrgSlug && orgHref
      ? orgHref
      : selected
      ? orgHomePath(selected.slug)
      : "/tenants";

  return (
    <div ref={rootRef} className={`relative ${fullWidth ? "w-full" : "w-max max-w-44"} ${className}`}>
      <form ref={formRef} action={selectTenantAction}>
        <input type="hidden" name="tenantId" defaultValue={selected.id} />
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((current) => !current)}
          className={`inline-flex max-w-full items-center gap-2 border font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-tint focus-visible:ring-offset-2 focus-visible:ring-offset-deep-ocean ${
            bar
              ? "h-[30px] rounded-full border-transparent bg-transparent py-0 pl-1.5 pr-1.5 text-[13px] text-zk-text hover:bg-zk-chip"
              : chrome
                ? "h-8 rounded-lg border-surface-border bg-[#132347] py-1 pl-2 pr-1.5 text-xs text-porcelain hover:bg-[#1a2d57]"
                : "h-8 rounded-lg border-slate-200 bg-card py-1 pl-2 pr-1.5 text-xs text-slate-900 hover:bg-slate-50"
          }`}
        >
          <WorkspaceMark name={selected.name} size={bar ? "xs" : "sm"} />
          <span className="truncate">{selectedLabel}</span>
          <svg
            className={`h-3.5 w-3.5 shrink-0 transition-transform duration-150 ${open ? "rotate-180 text-zk-accent" : bar ? "-ml-1.5 text-zk-muted" : "text-slate-400"}`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {open ? (
          <div
            className={`absolute left-0 top-full z-50 mt-1 rounded-lg border p-1 shadow-sm ${
              chrome
                ? "border-surface-border bg-[#142343]"
                : bar
                ? "w-64 rounded-2xl border-zk-border bg-zk-surface p-1.5 shadow-[0_16px_40px_rgba(11,23,51,0.16)]"
                : "border-slate-200 bg-card"
            } ${fullWidth ? "w-full" : bar ? "" : "w-max min-w-full max-w-56"}`}
          >
            <ul
              id={listId}
              role="listbox"
              aria-label="Workspaces"
              className="max-h-72 overflow-y-auto space-y-1"
            >
              {isExternalSelected ? (
                <li role="presentation">
                  <div
                    role="option"
                    aria-selected={true}
                    className={`flex w-full items-center gap-2 truncate rounded-md px-2 py-1.5 text-left ${bar ? "text-sm" : "text-xs"} ${
                      chrome
                        ? "bg-electric-blue/20 font-medium text-white"
                        : bar
                        ? "bg-zk-tint font-medium text-zk-accent"
                        : "bg-teal-50 font-medium text-teal-900"
                    }`}
                  >
                    {bar ? <WorkspaceMark name={selected.name} size="xs" /> : null}
                    <span className="truncate">{visibleName(selected, shared(selected.name))}</span>
                    <span className="ml-auto rounded border border-zk-border px-1 py-0.5 text-[9px] font-semibold text-zk-muted">
                      External
                    </span>
                  </div>

                  {selected.projects && selected.projects.length > 0 ? (
                    <div className="ml-5 my-0.5 space-y-0.5 border-l border-zk-border/60 pl-2">
                      {selected.projects.map((p) => (
                        <Link
                          key={p.id}
                          href={projectPath(projectRef(selected.slug, p.slug))}
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-zk-text2 transition hover:bg-zk-chip hover:text-zk-accent"
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="shrink-0 text-zk-muted"
                            aria-hidden="true"
                          >
                            <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
                          </svg>
                          <span className="truncate">{p.name}</span>
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </li>
              ) : null}

              {workspaces.map((workspace) => {
                const label = visibleName(workspace, shared(workspace.name));
                const current = workspace.id === selected.id;
                const projects = workspace.projects ?? [];
                return (
                  <li key={workspace.id} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={current}
                      onClick={() => choose(workspace.id)}
                      className={`flex w-full items-center gap-2 truncate rounded-md px-2 py-1.5 text-left ${bar ? "text-sm" : "text-xs"} ${
                        current
                          ? chrome
                            ? "bg-electric-blue/20 font-medium text-white"
                            : bar
                            ? "bg-zk-tint font-medium text-zk-accent"
                            : "bg-teal-50 font-medium text-teal-900"
                          : chrome
                            ? "text-slate-200 hover:bg-white/5"
                            : bar
                            ? "text-zk-text hover:bg-zk-chip"
                            : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {bar ? <WorkspaceMark name={workspace.name} size="xs" /> : null}
                      <span className="truncate">{label}</span>
                    </button>

                    {/* Clean project list for the selected organization */}
                    {current && projects.length > 0 ? (
                      <div className="ml-5 my-0.5 space-y-0.5 border-l border-zk-border/60 pl-2">
                        {projects.map((p) => (
                          <Link
                            key={p.id}
                            href={projectPath(projectRef(workspace.slug, p.slug))}
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-zk-text2 transition hover:bg-zk-chip hover:text-zk-accent"
                          >
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="shrink-0 text-zk-muted"
                              aria-hidden="true"
                            >
                              <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
                            </svg>
                            <span className="truncate">{p.name}</span>
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </li>
                );
              })}

              {/* External contributor projects if any */}
              {contributedProjects.length > 0 ? (
                <li role="presentation" className="border-t border-zk-divider pt-1">
                  <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-zk-muted">
                    Contributed Projects
                  </div>
                  <div className="space-y-0.5">
                    {contributedProjects.map((p) => (
                      <Link
                        key={p.id}
                        href={projectPath(projectRef(p.tenantSlug, p.slug))}
                        onClick={() => setOpen(false)}
                        className="flex items-center justify-between rounded-md px-2 py-1 text-xs text-zk-text2 transition hover:bg-zk-chip hover:text-zk-accent"
                      >
                        <span className="truncate font-medium">{p.name}</span>
                        <span className="max-w-[90px] truncate text-[10px] text-zk-muted">
                          {p.tenantName}
                        </span>
                      </Link>
                    ))}
                  </div>
                </li>
              ) : null}
            </ul>

            {/* Footer action links */}
            <div className={`mt-1 border-t pt-1 space-y-0.5 ${chrome ? "border-surface-border" : bar ? "border-zk-divider" : "border-slate-200"}`}>
              {canManage && primaryOrgTarget ? (
                <Link
                  href={primaryOrgTarget}
                  onClick={() => setOpen(false)}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left ${bar ? "text-sm font-medium text-zk-text hover:bg-zk-chip" : chrome ? "text-xs text-slate-200 hover:bg-white/5" : "text-xs text-slate-700 hover:bg-slate-50"}`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.85 1 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
                  </svg>
                  Manage organization
                </Link>
              ) : null}

              <Link
                href="/discover"
                onClick={() => setOpen(false)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left ${bar ? "text-sm font-medium text-zk-text hover:bg-zk-chip" : chrome ? "text-xs text-slate-200 hover:bg-white/5" : "text-xs text-slate-700 hover:bg-slate-50"}`}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                </svg>
                Discover Projects
              </Link>

              <Link
                href="/tenants#create-tenant"
                onClick={() => setOpen(false)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left ${bar ? "text-sm font-medium text-zk-accent hover:bg-zk-chip" : chrome ? "text-xs text-sky-tint hover:bg-white/5" : "text-xs text-teal-800 hover:bg-slate-50"}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Add organization
              </Link>
            </div>
          </div>
        ) : null}
      </form>
    </div>
  );
}
