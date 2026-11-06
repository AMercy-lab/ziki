import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { checkRateLimit } from "@/lib/rate-limit";

export const SKILL_CATEGORIES = [
  "testing",
  "security",
  "design",
  "backend",
  "marketing",
  "general",
] as const;

export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

export const SKILL_CATEGORY_LABELS: Record<SkillCategory, string> = {
  testing: "Testing & QA",
  security: "Security Guardrails",
  design: "Design & UI Systems",
  backend: "Backend & Databases",
  marketing: "SEO & Content Ops",
  general: "General Development",
};

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export const createSubmissionSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(120, "Title cannot exceed 120 characters"),
  category: z.enum(SKILL_CATEGORIES, { message: "Invalid skill category" }),
  summary: z.string().trim().min(10, "Summary must be at least 10 characters").max(400, "Summary cannot exceed 400 characters"),
  tags: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Tag cannot be empty")
        .max(30, "Tag cannot exceed 30 characters")
        .regex(/^[a-zA-Z0-9_-]+$/, "Tags may only contain letters, numbers, hyphens, and underscores")
    )
    .max(10, "Maximum of 10 tags allowed"),
  prompt: z
    .string()
    .trim()
    .min(10, "Prompt must be at least 10 characters")
    .max(10_000, "Prompt cannot exceed 10,000 characters"),
  checklist: z
    .array(
      z.string().trim().min(1, "Assertion cannot be empty").max(200, "Assertion cannot exceed 200 characters")
    )
    .max(15, "Maximum of 15 assertions allowed")
    .optional()
    .default([]),
  sampleCommand: z.string().trim().max(160, "Sample command cannot exceed 160 characters").optional().nullable(),
  documentationUrl: z
    .string()
    .trim()
    .max(300, "Documentation URL cannot exceed 300 characters")
    .regex(/^https?:\/\/.+/i, "Documentation URL must start with http:// or https://")
    .optional()
    .nullable(),
  revisionOfId: z.string().optional().nullable(),
});



export async function POST(req: NextRequest) {
  const user = await requireUser();

  // Rate limit: at most 5 submissions per 60 seconds per user
  const rateCheck = checkRateLimit(`skill-submission:${user.id}`, {
    max: 5,
    windowMs: 60 * 1000,
  });

  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "You're submitting skills too quickly. Please wait a moment." },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil(rateCheck.retryAfterMs / 1000).toString(),
        },
      }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  // Derive human-readable category label server-side (preventing arbitrary client text)
  const categoryLabel = SKILL_CATEGORY_LABELS[parsed.data.category];

  // If revising an existing rejected submission, update it back to pending rather than creating an orphan
  if (parsed.data.revisionOfId) {
    const existingSubmission = await prisma.skillSubmission.findFirst({
      where: { id: parsed.data.revisionOfId, submittedById: user.id },
    });
    if (existingSubmission && existingSubmission.status === "rejected") {
      const updated = await prisma.skillSubmission.update({
        where: { id: existingSubmission.id },
        data: {
          title: parsed.data.title,
          category: parsed.data.category,
          categoryLabel,
          summary: parsed.data.summary,
          tags: parsed.data.tags,
          prompt: parsed.data.prompt,
          checklist: parsed.data.checklist ?? [],
          sampleCommand: parsed.data.sampleCommand || null,
          documentationUrl: parsed.data.documentationUrl || null,
          status: "pending",
          rejectionReason: null,
          reviewedById: null,
          reviewedAt: null,
        },
        select: {
          id: true,
          slug: true,
          title: true,
          category: true,
          categoryLabel: true,
          summary: true,
          tags: true,
          prompt: true,
          checklist: true,
          sampleCommand: true,
          documentationUrl: true,
          status: true,
          submittedById: true,
          createdAt: true,
        },
      });
      return NextResponse.json({ submission: updated }, { status: 200 });
    }
  }

  // Derive unique slug from title
  let baseSlug = slugify(parsed.data.title);
  if (!baseSlug) baseSlug = `skill-${Date.now().toString(36)}`;
  let uniqueSlug = baseSlug;

  const existing = await prisma.skillSubmission.findUnique({
    where: { slug: uniqueSlug },
    select: { id: true },
  });

  if (existing) {
    uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
  }

  const submission = await prisma.skillSubmission.create({
    data: {
      slug: uniqueSlug,
      title: parsed.data.title,
      category: parsed.data.category,
      categoryLabel,
      summary: parsed.data.summary,
      tags: parsed.data.tags,
      prompt: parsed.data.prompt,
      checklist: parsed.data.checklist ?? [],
      sampleCommand: parsed.data.sampleCommand || null,
      documentationUrl: parsed.data.documentationUrl || null,
      status: "pending",
      submittedById: user.id,
    },
    select: {
      id: true,
      slug: true,
      title: true,
      category: true,
      categoryLabel: true,
      summary: true,
      tags: true,
      prompt: true,
      checklist: true,
      sampleCommand: true,
      documentationUrl: true,
      status: true,
      submittedById: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ submission }, { status: 201 });
}

