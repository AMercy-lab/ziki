import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { resolveSessionUserId } from "@/lib/session-user";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireSuperAdmin } from "@/lib/auth-helpers";

const createSubmissionSchema = z.object({
  title: z.string().min(1, "Title is required").max(160),
  category: z.string().min(1, "Category is required").max(40),
  categoryLabel: z.string().min(1, "Category label is required").max(80).optional(),
  summary: z.string().min(1, "Summary is required").max(500),
  tags: z.array(z.string().min(1)).max(20),
  prompt: z.string().min(1, "Prompt is required"),
  sampleCommand: z.string().max(200).optional().nullable(),
  documentationUrl: z.string().url().optional().nullable(),
  bounty: z.number().int().min(0).max(10000).optional(),
  revisionOfId: z.string().optional(),
  checklist: z.array(z.string()).optional().nullable(),
});

export async function GET() {
  await requireSuperAdmin();

  const submissions = await prisma.skillSubmission.findMany({
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      category: true,
      categoryLabel: true,
      summary: true,
      tags: true,
      prompt: true,
      sampleCommand: true,
      documentationUrl: true,
      bounty: true,
      status: true,
      submittedById: true,
      reviewedById: true,
      reviewedAt: true,
      rejectionReason: true,
      createdAt: true,
      updatedAt: true,
      submittedBy: { select: { id: true, name: true, email: true, image: true } },
      reviewedBy: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ submissions });
}

export async function POST(req: NextRequest) {
  const session = await resolveSessionUserId();
  if ("error" in session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const userId = session.userId;

  const rateLimit = checkRateLimit(`skill-submission:${userId}`, {
    max: 10,
    windowMs: 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "You're doing that too fast. Please wait a moment." },
      { status: 429 },
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

  const categoryLabel =
    parsed.data.categoryLabel || parsed.data.category.charAt(0).toUpperCase() + parsed.data.category.slice(1);

  // If revising an existing rejected submission, update it back to pending
  if (parsed.data.revisionOfId) {
    const existingSubmission = await prisma.skillSubmission.findFirst({
      where: { id: parsed.data.revisionOfId, submittedById: userId },
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
        } as unknown as Prisma.SkillSubmissionUpdateInput,
        select: {
          id: true,
          title: true,
          category: true,
          categoryLabel: true,
          summary: true,
          tags: true,
          prompt: true,
          sampleCommand: true,
          documentationUrl: true,
          bounty: true,
          status: true,
          submittedById: true,
          createdAt: true,
        },
      });
      return NextResponse.json(updated, { status: 200 });
    }
  }

  // Otherwise create a new submission
  const submission = await prisma.skillSubmission.create({
    data: {
      title: parsed.data.title,
      category: parsed.data.category,
      categoryLabel,
      summary: parsed.data.summary,
      tags: parsed.data.tags,
      prompt: parsed.data.prompt,
      sampleCommand: parsed.data.sampleCommand ?? null,
      documentationUrl: parsed.data.documentationUrl ?? null,
      bounty: parsed.data.bounty ?? 0,
      status: "pending",
      submittedById: userId,
    },
    select: {
      id: true,
      title: true,
      category: true,
      categoryLabel: true,
      summary: true,
      tags: true,
      prompt: true,
      sampleCommand: true,
      documentationUrl: true,
      bounty: true,
      status: true,
      submittedById: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ submission }, { status: 201 });
}

const notAllowed = NextResponse.json({ error: "Method not allowed" }, { status: 405 });
export const PUT = notAllowed;
export const DELETE = notAllowed;
