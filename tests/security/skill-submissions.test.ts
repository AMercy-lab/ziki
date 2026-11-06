import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireSuperAdmin: vi.fn(),
  requireUser: vi.fn(),
  prismaFindUnique: vi.fn(),
  prismaFindMany: vi.fn(),
  prismaUpdate: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth-helpers", () => ({
  requireSuperAdmin: mocks.requireSuperAdmin,
  requireUser: mocks.requireUser,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    skillSubmission: {
      findUnique: mocks.prismaFindUnique,
      findMany: mocks.prismaFindMany,
      update: mocks.prismaUpdate,
    },
  },
}));

import { reviewSkillSubmissionAction } from "@/app/actions/skill-submissions";
import { createSubmissionSchema } from "@/app/api/v1/skills/submissions/route";

describe("Skill Submissions Review Authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refuses review for any user who is not a super admin", async () => {
    mocks.requireSuperAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(reviewSkillSubmissionAction("sub-1", "approved")).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.prismaUpdate).not.toHaveBeenCalled();
  });

  it("allows a super admin to approve a pending submission and records the reviewer", async () => {
    mocks.requireSuperAdmin.mockResolvedValue({ id: "admin-42", isRealSuperAdmin: true });
    mocks.prismaFindUnique.mockResolvedValue({ id: "sub-1", status: "pending" });
    mocks.prismaUpdate.mockResolvedValue({ id: "sub-1", status: "approved" });

    const result = await reviewSkillSubmissionAction("sub-1", "approved");

    expect(result).toEqual({ ok: true });
    expect(mocks.prismaUpdate).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: expect.objectContaining({
        status: "approved",
        reviewedById: "admin-42",
        rejectionReason: null,
      }),
    });
  });

  it("records rejection feedback when a super admin requests changes", async () => {
    mocks.requireSuperAdmin.mockResolvedValue({ id: "admin-42", isRealSuperAdmin: true });
    mocks.prismaFindUnique.mockResolvedValue({ id: "sub-2", status: "pending" });
    mocks.prismaUpdate.mockResolvedValue({ id: "sub-2", status: "rejected" });

    const result = await reviewSkillSubmissionAction("sub-2", "rejected", "Please add test assertions.");

    expect(result).toEqual({ ok: true });
    expect(mocks.prismaUpdate).toHaveBeenCalledWith({
      where: { id: "sub-2" },
      data: expect.objectContaining({
        status: "rejected",
        reviewedById: "admin-42",
        rejectionReason: "Please add test assertions.",
      }),
    });
  });

  it("prevents re-deciding an already reviewed submission", async () => {
    mocks.requireSuperAdmin.mockResolvedValue({ id: "admin-42", isRealSuperAdmin: true });
    mocks.prismaFindUnique.mockResolvedValue({ id: "sub-1", status: "approved" });

    const result = await reviewSkillSubmissionAction("sub-1", "rejected", "Second thought");

    expect(result).toEqual({ ok: false, error: "Submission has already been reviewed" });
    expect(mocks.prismaUpdate).not.toHaveBeenCalled();
  });

  it("returns error if submission is not found", async () => {
    mocks.requireSuperAdmin.mockResolvedValue({ id: "admin-42" });
    mocks.prismaFindUnique.mockResolvedValue(null);

    const result = await reviewSkillSubmissionAction("nonexistent", "approved");

    expect(result).toEqual({ ok: false, error: "Submission not found" });
    expect(mocks.prismaUpdate).not.toHaveBeenCalled();
  });
});

describe("Skill Submission Input Validation", () => {
  const validSubmission = {
    title: "Vitest Deterministic Suite Runner",
    category: "testing",
    summary: "Configures Vitest to run unit tests with deterministic seed and 0 network dependencies.",
    tags: ["vitest", "testing", "ci"],
    prompt: "You are a test runner expert. Always run vitest run --reporter=verbose before committing.",
    checklist: ["Ensures all assertions pass", "Flags console errors as test failures"],
    sampleCommand: "npm run test",
    documentationUrl: "https://vitest.dev/guide/",
  };

  it("accepts a well-formed skill submission", () => {
    const parsed = createSubmissionSchema.safeParse(validSubmission);
    expect(parsed.success).toBe(true);
  });

  it("rejects documentation URLs with non-http(s) schemes like javascript: or ftp:", () => {
    expect(
      createSubmissionSchema.safeParse({
        ...validSubmission,
        documentationUrl: "javascript:alert(1)",
      }).success
    ).toBe(false);

    expect(
      createSubmissionSchema.safeParse({
        ...validSubmission,
        documentationUrl: "ftp://files.example.com/spec.pdf",
      }).success
    ).toBe(false);

    expect(
      createSubmissionSchema.safeParse({
        ...validSubmission,
        documentationUrl: "https://trusted-docs.example.com",
      }).success
    ).toBe(true);
  });

  it("rejects prompts exceeding maximum length limits", () => {
    expect(
      createSubmissionSchema.safeParse({
        ...validSubmission,
        prompt: "x".repeat(10_001),
      }).success
    ).toBe(false);
  });

  it("rejects arbitrary unallowed category strings", () => {
    expect(
      createSubmissionSchema.safeParse({
        ...validSubmission,
        category: "malicious-category-override",
      }).success
    ).toBe(false);
  });

  it("rejects tags that exceed 30 characters or have unallowed characters", () => {
    expect(
      createSubmissionSchema.safeParse({
        ...validSubmission,
        tags: ["a".repeat(31)],
      }).success
    ).toBe(false);

    expect(
      createSubmissionSchema.safeParse({
        ...validSubmission,
        tags: ["bad tag with spaces"],
      }).success
    ).toBe(false);
  });
});
