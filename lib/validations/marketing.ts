import { z } from "zod";
import { entryDescription, entrySummary } from "@/lib/agent-api/entry-fields";
import { revisionLimitSchema } from "@/lib/workflow-config";

/**
 * What marketing work adds to the shared forms and routes
 * (docs/marketing-migration-plan.md, "The marketing track rules").
 */

const httpUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => /^https?:\/\/\S+$/i.test(value), "Enter a full http or https link.");

/** What a marketing idea needs on top of an ordinary idea: why it is worth doing. */
export const marketingIdeaFieldsSchema = z.object({
  track: z.literal("marketing"),
  rationale: z.string({ error: "Say why this is worth doing." }).trim().min(1, "Say why this is worth doing.").max(2000),
});

/** A marketing delivery: links to the finished work, with no pull request. Strict, so a pull request is refused. */
export const marketingDeliveryBodySchema = z
  .object({
    /** At most two sentences: what was done. */
    summary: entrySummary,
    /** What was made, how it was checked, and anything left open. */
    description: entryDescription,
    deliverableUrls: z.array(httpUrl).min(1, "Link to the finished work.").max(20),
    screenshots: z.array(z.string().trim().min(1).max(2048)).max(20).optional(),
  })
  .strict();

/** Settings for marketing workflow (M-API-6): revision limit before reopening for bids. */
export const updateMarketingSettingsSchema = z
  .object({
    revisionLimit: revisionLimitSchema,
  })
  .strict();

export const marketingSettingsSchema = updateMarketingSettingsSchema;
export type UpdateMarketingSettingsInput = z.infer<typeof updateMarketingSettingsSchema>;
