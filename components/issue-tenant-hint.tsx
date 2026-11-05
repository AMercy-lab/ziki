"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";
import { switchIssueWorkspaceAction } from "@/app/(app)/tenants/issue-switch-action";
import type { IssueTenantHint } from "@/lib/issue-tenant-hint";
import { stateLabel } from "@/lib/labels";
import styles from "./issue-workspace-switch.module.css";

export function IssueTenantSwitch({issueId, tenant, currentWorkspace, destination}: {issueId: string; tenant: IssueTenantHint; currentWorkspace?: string; destination: string}) {
  const [state, action, pending] = useActionState(switchIssueWorkspaceAction, {});
  const returnTo = useRef<HTMLInputElement>(null);
  return <section className={styles.notice} aria-labelledby="workspace-switch-title">
    <span className={styles.eyebrow}>⇄ Different workspace</span>
    <h1 id="workspace-switch-title">This issue is in the {tenant.name} workspace</h1>
    <p className={styles.lede}>{currentWorkspace ? <>You&apos;re in <strong>{currentWorkspace}</strong> right now. </> : <>A different workspace is active. </>}Issue <strong>#{tenant.issue.number}</strong> belongs to <strong>{tenant.name}</strong>, another workspace you&apos;re a member of. Switch to open it.</p>
    <div className={styles.route} aria-label="Workspace change">
      <div className={styles.workspace}><span className={styles.avatar}>{currentWorkspace?.slice(0, 1) ?? "W"}</span><div><strong>{currentWorkspace ?? "Current workspace"}</strong><small>You&apos;re here</small></div></div>
      <span className={styles.arrow} aria-hidden="true">→</span>
      <div className={`${styles.workspace} ${styles.target}`}><span className={styles.avatar}>{tenant.name.slice(0, 1)}</span><div><strong>{tenant.name}</strong><small>The issue is here</small></div></div>
    </div>
    <div className={styles.preview}><div className={styles.metadata}><span>#{tenant.issue.number}</span><span>{tenant.name} · {tenant.issue.projectName}</span><span className={styles.status}>{stateLabel(tenant.issue.substatus)}</span></div><strong>{tenant.issue.title}</strong><small>Shown because you&apos;re a member of {tenant.name}.</small></div>
    <form action={action} className={styles.actions} onSubmit={() => { if (returnTo.current) returnTo.current.value = destination + window.location.hash; }}>
      <input type="hidden" name="issueId" value={issueId}/><input type="hidden" name="tenantId" value={tenant.id}/><input ref={returnTo} type="hidden" name="returnTo" defaultValue={destination}/>
      <button className={styles.primary} type="submit" disabled={pending}>{pending ? "Switching workspace…" : `Switch to ${tenant.name} and open #${tenant.issue.number}`} <span aria-hidden="true">→</span></button>
      <Link href="/home" className={styles.secondary}>{currentWorkspace ? `Stay in ${currentWorkspace}` : "Back to my workspace"}</Link>
    </form>
    {state.error ? <p role="alert" className={styles.error}>{state.error}</p> : null}
    <p className={styles.fine}>Workspace access is checked again when you switch. If your access changes, the issue remains private.</p>
  </section>;
}
