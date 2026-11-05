"use server";

import { revalidatePath } from "next/cache";

import { typeChangedSummary } from "@/lib/activity-log";
import { IssueApiError } from "@/lib/agent-api/errors";
import { expireTag, TAGS } from "@/lib/cache-tags";
import { canDeleteIssueType, issueTypeInputSchema } from "@/lib/issue-types";
import { assertMarketingSettingsAccess, updateMarketingSettings } from "@/lib/marketing/settings";
import { marketingPath } from "@/lib/project-paths";
import { prisma } from "@/lib/prisma";
import { requireProject } from "@/lib/project-route";
import { revisionLimitSchema } from "@/lib/workflow-config";

export type MarketingSettingsActionResult = { error?: string; ok?: boolean };

const TYPE_NOT_FOUND = "Marketing task type not found.";

/** Prisma P2025: the row was deleted (e.g. by another admin) before we wrote to it. */
function isRecordNotFound(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "P2025";
}

const isUniqueViolation = (err: unknown): boolean =>
  typeof err === "object" && err !== null && "code" in err && err.code === "P2002";

/**
 * The project whose marketing settings are being changed, after the access
 * check. Members are refused with the message from the rule, so they read the
 * settings but never change them.
 */
async function requireSettingsAdmin(slug: string) {
  const context = await requireProject(slug, marketingPath(slug, "settings"));
  try {
    await assertMarketingSettingsAccess(context.user, context.tenantId, "change");
  } catch (error) {
    if (error instanceof IssueApiError) return { error: error.message };
    throw error;
  }
  return {
    tenantId: context.tenantId,
    projectId: context.project.id,
    projectSlug: context.project.slug,
    userId: context.user.id,
  };
}

function revalidateMarketing(slug: string): void {
  revalidatePath(marketingPath(slug, "settings"));
  revalidatePath(marketingPath(slug));
}

/**
 * The revision limit dial (M-UI-7 for M-API-6): how many send-backs a marketing
 * delivery takes before the task reopens for bids. The lib function owns the
 * rule: it bounds the value to 1–10, refuses non-admins and audits the change.
 */
export async function updateMarketingRevisionLimitAction(
  slug: string,
  formData: FormData,
): Promise<MarketingSettingsActionResult> {
  const admin = await requireSettingsAdmin(slug);
  if ("error" in admin) return admin;

  const parsed = revisionLimitSchema.safeParse(Number(formData.get("revisionLimit")));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revision limit must be a whole number from 1 to 10." };
  }

  try {
    await updateMarketingSettings(admin.tenantId, admin.projectId, admin.userId, { revisionLimit: parsed.data });
  } catch (error) {
    if (error instanceof IssueApiError) return { error: error.message };
    throw error;
  }

  revalidateMarketing(slug);
  return { ok: true };
}

/** The form fields a task type carries; no points, because pay comes from each task's reward. */
function parseTypeInput(formData: FormData) {
  const rawName = formData.get("name")?.toString() ?? "";
  const rawDescription = formData.get("description")?.toString() ?? "";
  const rawActive = formData.get("isActive");
  // An unticked checkbox isn't sent, so a missing value means inactive.
  const isActive = rawActive === "true" || rawActive === "on";
  return issueTypeInputSchema.safeParse({
    name: rawName,
    description: rawDescription ? rawDescription : null,
    template: null,
    isActive,
  });
}

/**
 * Create a marketing task type (M-UI-7 for M-API-7). The name stays unique per
 * tenant across both tracks, matching the model's `(tenantId, name)` key, so a
 * marketing type can't shadow a product type.
 */
export async function createMarketingIssueTypeAction(
  slug: string,
  formData: FormData,
): Promise<MarketingSettingsActionResult> {
  const admin = await requireSettingsAdmin(slug);
  if ("error" in admin) return admin;

  const parsed = parseTypeInput(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid task type." };
  }
  const name = parsed.data.name.trim();

  const existing = await prisma.issueType.findFirst({
    where: { tenantId: admin.tenantId, name: { equals: name, mode: "insensitive" } },
    select: { name: true },
  });
  if (existing) return { error: `A type named "${existing.name}" already exists.` };

  try {
    await prisma.issueType.create({
      data: {
        tenantId: admin.tenantId,
        name,
        description: parsed.data.description,
        track: "marketing",
        isActive: parsed.data.isActive,
      },
    });
  } catch (err: unknown) {
    if (isUniqueViolation(err)) return { error: `A type named "${name}" already exists.` };
    throw err;
  }

  expireTag(TAGS.issueTypes);
  revalidateMarketing(slug);
  return { ok: true };
}

/** Update a marketing task type. Renames leave a note on the tasks that carry the type. */
export async function updateMarketingIssueTypeAction(
  slug: string,
  id: string,
  formData: FormData,
): Promise<MarketingSettingsActionResult> {
  const admin = await requireSettingsAdmin(slug);
  if ("error" in admin) return admin;
  if (!id || typeof id !== "string") return { error: "Invalid task type." };

  const parsed = parseTypeInput(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid task type." };
  }
  const name = parsed.data.name.trim();

  const current = await prisma.issueType.findFirst({
    where: { id, tenantId: admin.tenantId, track: "marketing" },
  });
  if (!current) return { error: TYPE_NOT_FOUND };

  const existing = await prisma.issueType.findFirst({
    where: { tenantId: admin.tenantId, name: { equals: name, mode: "insensitive" }, NOT: { id } },
    select: { name: true },
  });
  if (existing) return { error: `Another type named "${existing.name}" already exists.` };

  try {
    await prisma.$transaction(async (tx) => {
      const row = await tx.issueType.findFirst({ where: { id, tenantId: admin.tenantId } });
      if (!row) return;

      await tx.issueType.update({
        where: { id },
        data: {
          name,
          description: parsed.data.description,
          isActive: parsed.data.isActive,
        },
      });

      if (row.name !== name) {
        const linked = await tx.bug.findMany({
          where: { typeId: id, tenantId: admin.tenantId },
          select: { id: true },
        });
        if (linked.length > 0) {
          await tx.bugActivity.createMany({
            data: linked.map((task) => ({
              bugId: task.id,
              actorId: admin.userId,
              type: "type_changed",
              summary: typeChangedSummary(row.name, name),
              metadata: { field: "type", from: row.name, to: name },
            })),
          });
        }
      }
    });
  } catch (err: unknown) {
    if (isUniqueViolation(err)) return { error: `Another type named "${name}" already exists.` };
    if (isRecordNotFound(err)) return { error: TYPE_NOT_FOUND };
    throw err;
  }

  expireTag(TAGS.issueTypes);
  revalidateMarketing(slug);
  return { ok: true };
}

/** Active types are offered when a marketing task is proposed; retired ones keep their history. */
export async function toggleMarketingIssueTypeActiveAction(
  slug: string,
  id: string,
): Promise<MarketingSettingsActionResult> {
  const admin = await requireSettingsAdmin(slug);
  if ("error" in admin) return admin;
  if (!id || typeof id !== "string") return { error: "Invalid task type." };

  const existing = await prisma.issueType.findFirst({
    where: { id, tenantId: admin.tenantId, track: "marketing" },
    select: { isActive: true },
  });
  if (!existing) return { error: TYPE_NOT_FOUND };

  try {
    await prisma.issueType.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });
  } catch (err: unknown) {
    if (isRecordNotFound(err)) return { error: TYPE_NOT_FOUND };
    throw err;
  }

  expireTag(TAGS.issueTypes);
  revalidateMarketing(slug);
  return { ok: true };
}

/**
 * Delete a marketing task type. Types that tasks still use are refused, with
 * the reason and the thing to do instead: deactivate the type.
 */
export async function deleteMarketingIssueTypeAction(
  slug: string,
  id: string,
): Promise<MarketingSettingsActionResult> {
  const admin = await requireSettingsAdmin(slug);
  if ("error" in admin) return admin;
  if (!id || typeof id !== "string") return { error: "Invalid task type." };

  const existing = await prisma.issueType.findFirst({
    where: { id, tenantId: admin.tenantId, track: "marketing" },
    select: { id: true },
  });
  if (!existing) return { error: TYPE_NOT_FOUND };

  const usage = await prisma.bug.count({
    where: { typeId: id, tenantId: admin.tenantId, track: "marketing" },
  });
  const check = canDeleteIssueType(usage);
  if (!check.allowed) return { error: check.reason };

  try {
    await prisma.issueType.delete({ where: { id } });
  } catch (err: unknown) {
    if (isRecordNotFound(err)) return { error: TYPE_NOT_FOUND };
    throw err;
  }

  expireTag(TAGS.issueTypes);
  revalidateMarketing(slug);
  return { ok: true };
}
