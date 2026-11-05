"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProjectJoinModal } from "@/components/project-join-modal";
import { projectPath, projectRef } from "@/lib/project-paths";

export type DiscoverableProject = {
  id: string;
  slug: string;
  name: string;
  goal: string | null;
  siteUrl: string | null;
  repoUrl: string | null;
  isOpenForContributors: boolean;
  contributorGuidelines: string | null;
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  _count: {
    bugs: number;
    ideas: number;
  };
  userStatus: "member" | "pending" | "rejected" | "none" | "guest";
};

export function DiscoverProjectCard({ project }: { project: DiscoverableProject }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(project.userStatus);

  return (
    <>
      <article className="flex flex-col justify-between rounded-[20px] border border-zk-border bg-zk-surface p-5 transition hover:border-zk-border-hover sm:p-6">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-zk-muted">
                {project.tenant.name}
              </span>
              <h3 className="text-lg font-bold text-zk-text">
                <Link href={projectPath(projectRef(project.tenant.slug, project.slug))} className="hover:text-zk-accent hover:underline">
                  {project.name}
                </Link>
              </h3>
            </div>
            {project.isOpenForContributors ? (
              <Badge className="shrink-0 rounded-full border border-zk-accent/30 bg-zk-tint text-[11px] font-semibold text-zk-accent">
                Open for Contributors
              </Badge>
            ) : (
              <Badge className="shrink-0 rounded-full border border-zk-border bg-zk-chip text-[11px] text-zk-text2">
                Public View
              </Badge>
            )}
          </div>

          <p className="line-clamp-2 text-sm text-zk-text2">
            {project.goal || "No project description provided."}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs text-zk-muted">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
              {project._count.bugs} open issues
            </span>
            <span className="flex items-center gap-1.5">
              💡 {project._count.ideas} ideas
            </span>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-zk-divider pt-4">
          <div className="flex items-center gap-2 text-xs text-zk-muted">
            {project.repoUrl ? (
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="hover:text-zk-text hover:underline"
              >
                Code ↗
              </a>
            ) : null}
            {project.siteUrl ? (
              <a
                href={project.siteUrl}
                target="_blank"
                rel="noreferrer"
                className="hover:text-zk-text hover:underline"
              >
                Website ↗
              </a>
            ) : null}
          </div>

          <div>
            {currentStatus === "guest" ? (
              <Link href={`/login?callbackUrl=${encodeURIComponent("/discover")}`}>
                <Button variant={project.isOpenForContributors ? "primary" : "secondary"} className="text-xs">
                  {project.isOpenForContributors ? "Sign in to Join" : "Sign in to View"}
                </Button>
              </Link>
            ) : currentStatus === "member" ? (
              <Link href={projectPath(projectRef(project.tenant.slug, project.slug))}>
                <Button variant="secondary" className="text-xs">
                  Open Project →
                </Button>
              </Link>
            ) : currentStatus === "pending" ? (
              <Button variant="ghost" disabled className="text-xs text-zk-muted">
                Request Pending ⏳
              </Button>
            ) : project.isOpenForContributors ? (
              <Button
                variant="primary"
                onClick={() => setModalOpen(true)}
                className="text-xs"
              >
                {currentStatus === "rejected" ? "Re-apply to Join" : "Request to Join"}
              </Button>
            ) : (
              <Link href={projectPath(projectRef(project.tenant.slug, project.slug))}>
                <Button variant="secondary" className="text-xs">
                  Browse Issues
                </Button>
              </Link>
            )}
          </div>
        </div>
      </article>

      <ProjectJoinModal
        project={project}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => setCurrentStatus("pending")}
      />
    </>
  );
}
