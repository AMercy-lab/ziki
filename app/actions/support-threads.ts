"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth-helpers";
import { currentTenantIdFor } from "@/lib/tenant-context";
import { revalidateIssue } from "@/lib/revalidate-issue";
import { consumeRateLimit, ACTION_RATE_LIMITS, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { IssueApiError } from "@/lib/agent-api/errors";
import {
  createSupportThreadSchema,
  addRequesterMessageSchema,
  takeSupportThreadSchema,
  replySupportThreadSchema,
  releaseSupportThreadSchema,
  resolveSupportThreadSchema,
} from "@/lib/validations/support-thread";
import {
  createSupportThread,
  addRequesterMessage,
  takeSupportThread,
  replySupportThread,
  releaseSupportThread,
  resolveSupportThread,
  type SupportThreadResult,
} from "@/lib/support-threads";

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export async function createSupportThreadAction(input: unknown): Promise<ActionResult<{ threadId: string }>> {
  const user = await requireUser();
  const limit = await consumeRateLimit(`support-thread:${user.id}`, ACTION_RATE_LIMITS.supportThread);
  if (!limit.allowed) return { ok: false, error: RATE_LIMIT_MESSAGE };

  const tenantId = await currentTenantIdFor(user.id);
  if (!tenantId) return { ok: false, error: "Workspace membership required." };

  const parsed = createSupportThreadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const result = await createSupportThread(user, tenantId, parsed.data.issueId, parsed.data.body);
    if (!result.ok) return result;

    revalidatePath("/inbox");
    revalidateIssue();
    return { ok: true, threadId: result.threadId };
  } catch (error) {
    if (error instanceof IssueApiError) return { ok: false, error: error.message };
    console.error("[createSupportThreadAction] error", error);
    return { ok: false, error: "Could not create request. Please try again." };
  }
}

export async function addRequesterMessageAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const limit = await consumeRateLimit(`support-thread:${user.id}`, ACTION_RATE_LIMITS.supportThread);
  if (!limit.allowed) return { ok: false, error: RATE_LIMIT_MESSAGE };

  const tenantId = await currentTenantIdFor(user.id);
  if (!tenantId) return { ok: false, error: "Workspace membership required." };

  const parsed = addRequesterMessageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const result = await addRequesterMessage(user, tenantId, parsed.data.threadId, parsed.data.body);
    if (!result.ok) return result;

    revalidatePath("/inbox");
    return { ok: true };
  } catch (error) {
    if (error instanceof IssueApiError) return { ok: false, error: error.message };
    console.error("[addRequesterMessageAction] error", error);
    return { ok: false, error: "Could not send message. Please try again." };
  }
}

export async function takeSupportThreadAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const limit = await consumeRateLimit(`support-thread:${user.id}`, ACTION_RATE_LIMITS.supportThread);
  if (!limit.allowed) return { ok: false, error: RATE_LIMIT_MESSAGE };

  const tenantId = await currentTenantIdFor(user.id);
  if (!tenantId) return { ok: false, error: "Workspace membership required." };

  const parsed = takeSupportThreadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const result = await takeSupportThread(user, tenantId, parsed.data.threadId, parsed.data.agentId);
    if (!result.ok) return result;

    revalidatePath("/inbox");
    revalidateIssue();
    return { ok: true };
  } catch (error) {
    if (error instanceof IssueApiError) return { ok: false, error: error.message };
    console.error("[takeSupportThreadAction] error", error);
    return { ok: false, error: "Could not take request. Please try again." };
  }
}

export async function replySupportThreadAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const limit = await consumeRateLimit(`support-thread:${user.id}`, ACTION_RATE_LIMITS.supportThread);
  if (!limit.allowed) return { ok: false, error: RATE_LIMIT_MESSAGE };

  const tenantId = await currentTenantIdFor(user.id);
  if (!tenantId) return { ok: false, error: "Workspace membership required." };

  const parsed = replySupportThreadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const result = await replySupportThread(user, tenantId, parsed.data.threadId, parsed.data.body);
    if (!result.ok) return result;

    revalidatePath("/inbox");
    return { ok: true };
  } catch (error) {
    if (error instanceof IssueApiError) return { ok: false, error: error.message };
    console.error("[replySupportThreadAction] error", error);
    return { ok: false, error: "Could not send reply. Please try again." };
  }
}

export async function releaseSupportThreadAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const limit = await consumeRateLimit(`support-thread:${user.id}`, ACTION_RATE_LIMITS.supportThread);
  if (!limit.allowed) return { ok: false, error: RATE_LIMIT_MESSAGE };

  const tenantId = await currentTenantIdFor(user.id);
  if (!tenantId) return { ok: false, error: "Workspace membership required." };

  const parsed = releaseSupportThreadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const result = await releaseSupportThread(user, tenantId, parsed.data.threadId);
    if (!result.ok) return result;

    revalidatePath("/inbox");
    revalidateIssue();
    return { ok: true };
  } catch (error) {
    if (error instanceof IssueApiError) return { ok: false, error: error.message };
    console.error("[releaseSupportThreadAction] error", error);
    return { ok: false, error: "Could not release request. Please try again." };
  }
}

export async function resolveSupportThreadAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const limit = await consumeRateLimit(`support-thread:${user.id}`, ACTION_RATE_LIMITS.supportThread);
  if (!limit.allowed) return { ok: false, error: RATE_LIMIT_MESSAGE };

  const tenantId = await currentTenantIdFor(user.id);
  if (!tenantId) return { ok: false, error: "Workspace membership required." };

  const parsed = resolveSupportThreadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const result = await resolveSupportThread(user, tenantId, parsed.data.threadId);
    if (!result.ok) return result;

    revalidatePath("/inbox");
    revalidateIssue();
    return { ok: true };
  } catch (error) {
    if (error instanceof IssueApiError) return { ok: false, error: error.message };
    console.error("[resolveSupportThreadAction] error", error);
    return { ok: false, error: "Could not resolve request. Please try again." };
  }
}

