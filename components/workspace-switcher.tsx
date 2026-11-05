"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
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
  const listId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [expandedOrgIds, setExpandedOrgIds] = useState<Set<string>>(new Set());

  const counts = new Map<string, number>();
  for (const workspace of workspaces) {
    const key = workspace.name.toLocaleLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const shared = (name: string) => (counts.get(name.toLocaleLowerCase()) ?? 0) > 1;
  const selected =
    workspaces.find((workspace) => workspace.id === activeTenantId) ?? workspaces[0];

  const otherOrgs = workspaces.filter((w) => w.id !== selected?.id);

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

  function toggleOrgExpand(id: string) {
    setExpandedOrgIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const primaryOrgTarget = orgHref || (selected ? orgHomePath(selected.slug) : "/tenants");

  return (
    <div ref={rootRef} className={`relative ${fullWidth ? "w-full" : "w-max max-w-56"} ${className}`}>
      <form ref={formRef} action={selectTenantAction}>
        <input type="hidden" name="tenantId" defaultValue={selected.id} />

        {/* Split Trigger Button */}
        <div className="inline-flex max-w-full items-center rounded-full border border-zk-border bg-zk-surface shadow-sm transition hover:border-zk-border-hover">
          {/* Org link: directly opens the org home / admin page */}
          <Link
            href={primaryOrgTarget}
            title={`Go to ${selectedLabel}`}
            className="inline-flex min-w-0 max-w-[130px] items-center gap-1.5 rounded-l-full py-1 pl-2.5 pr-1 text-[13px] font-medium text-zk-text transition hover:bg-zk-chip hover:text-zk-accent max-sm:max-w-[95px] max-sm:text-xs"
          >
            <WorkspaceMark name={selected.name} size="xs" />
            <span className="truncate">{selectedLabel}</span>
          </Link>

          <span className="h-3.5 w-px bg-zk-border" aria-hidden="true" />

          {/* Chevron toggle: opens accordion dropdown switcher */}
          <button
            type="button"
            aria-haspopup="true"
            aria-expanded={open}
            aria-controls={listId}
            aria-label={`Switch workspace from ${selectedLabel}`}
            onClick={() => setOpen((current) => !current)}
            className="inline-flex items-center justify-center rounded-r-full p-1.5 text-zk-muted transition hover:bg-zk-chip hover:text-zk-text"
          >
            <svg
              className={`h-3.5 w-3.5 transition-transform duration-150 ${
                open ? "rotate-180 text-zk-accent" : ""
              }`}
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
        </div>

        {/* Accordion Popover */}
        {open ? (
          <div
            id={listId}
            className="absolute left-0 top-full z-50 mt-1.5 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-zk-border bg-zk-surface p-2 shadow-[0_16px_40px_rgba(11,23,51,0.18)]"
          >
            <div className="max-h-80 overflow-y-auto space-y-3">
              {/* 1. Active Organization & Projects */}
              <div>
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zk-muted">
                    Current Organization
                  </span>
                  <span className="rounded-full bg-zk-tint px-1.5 py-0.5 text-[10px] font-semibold text-zk-accent">
                    Active
                  </span>
                </div>

                <div className="flex items-center justify-between px-2 py-1">
                  <span className="truncate text-xs font-bold text-zk-text">{selectedLabel}</span>
                  <Link
                    href={primaryOrgTarget}
                    onClick={() => setOpen(false)}
                    className="shrink-0 text-[11px] font-medium text-zk-accent hover:underline"
                  >
                    Open Org →
                  </Link>
                </div>

                <div className="mt-1 space-y-0.5">
                  {selected.projects && selected.projects.length > 0 ? (
                    selected.projects.map((p) => (
                      <Link
                        key={p.id}
                        href={projectPath(projectRef(selected.slug, p.slug))}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-2.5 py-1 text-xs text-zk-text transition hover:bg-zk-chip hover:text-zk-accent"
                      >
                        <span className="text-zk-muted text-[11px]">📁</span>
                        <span className="truncate font-medium">{p.name}</span>
                      </Link>
                    ))
                  ) : (
                    <p className="px-2.5 py-1 text-[11px] text-zk-muted">
                      No projects in this organization yet.
                    </p>
                  )}
                </div>
              </div>

              {/* 2. External Projects */}
              {externalProjects.length > 0 ? (
                <div className="border-t border-zk-divider pt-2">
                  <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-zk-muted">
                    External Projects
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {externalProjects.map((p) => (
                      <Link
                        key={p.id}
                        href={`/projects/${p.slug}/open?tenant=${p.tenantId}&next=${encodeURIComponent(
                          projectPath(projectRef(p.tenantSlug, p.slug))
                        )}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center justify-between rounded-lg px-2.5 py-1 text-xs text-zk-text transition hover:bg-zk-chip hover:text-zk-accent"
                      >
                        <span className="truncate font-medium">{p.name}</span>
                        <span className="max-w-[100px] truncate text-[10px] text-zk-muted">
                          {p.tenantName}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* 3. Other Organizations Accordion */}
              {otherOrgs.length > 0 ? (
                <div className="border-t border-zk-divider pt-2">
                  <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-zk-muted">
                    Other Organizations
                  </div>
                  <div className="mt-1 space-y-1">
                    {otherOrgs.map((org) => {
                      const isExpanded = expandedOrgIds.has(org.id);
                      const projects = org.projects || [];
                      return (
                        <div key={org.id} className="rounded-lg border border-zk-border/60 bg-zk-chip/20">
                          <div className="flex items-center justify-between px-2 py-1 text-xs text-zk-text">
                            <button
                              type="button"
                              onClick={() => choose(org.id)}
                              className="flex min-w-0 flex-1 items-center gap-2 text-left font-medium hover:text-zk-accent"
                            >
                              <WorkspaceMark name={org.name} size="xs" />
                              <span className="truncate">{visibleName(org, shared(org.name))}</span>
                            </button>
                            {projects.length > 0 ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleOrgExpand(org.id);
                                }}
                                className="rounded p-1 text-zk-muted hover:bg-zk-chip hover:text-zk-text"
                                aria-label={isExpanded ? `Collapse ${org.name}` : `Expand ${org.name}`}
                              >
                                <svg
                                  className={`h-3.5 w-3.5 transition-transform duration-150 ${
                                    isExpanded ? "rotate-180 text-zk-accent" : ""
                                  }`}
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </button>
                            ) : null}
                          </div>
                          {isExpanded && projects.length > 0 ? (
                            <div className="space-y-0.5 border-t border-zk-border/40 bg-zk-surface px-2 py-1">
                              {projects.map((p) => (
                                <Link
                                  key={p.id}
                                  href={`/projects/${p.slug}/open?tenant=${org.id}&next=${encodeURIComponent(
                                    projectPath(projectRef(org.slug, p.slug))
                                  )}`}
                                  onClick={() => setOpen(false)}
                                  className="block truncate py-0.5 text-xs text-zk-text2 transition hover:text-zk-accent"
                                >
                                  • {p.name}
                                </Link>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            {/* 4. Footer */}
            <div className="mt-2 border-t border-zk-divider pt-2 space-y-0.5">
              <Link
                href="/discover"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zk-text transition hover:bg-zk-chip hover:text-zk-accent"
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
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zk-accent transition hover:bg-zk-chip"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Add Organization
              </Link>
            </div>
          </div>
        ) : null}
      </form>
    </div>
  );
}
