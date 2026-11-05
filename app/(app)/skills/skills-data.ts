import { prisma } from "@/lib/prisma";

export type SkillCategory = "testing" | "security" | "design" | "backend" | "marketing";
export type SkillBadgeColor = "blue" | "emerald" | "indigo" | "pink" | "purple" | "cyan" | "amber";

export interface SkillItem {
  id: string;
  slug: string;
  title: string;
  icon: "flutter" | "shield" | "browser" | "figma" | "database" | "a11y" | "test" | "api" | "seo";
  category: SkillCategory;
  categoryLabel: string;
  badge: string;
  badgeColor?: SkillBadgeColor;
  description: string;
  tags: string[];
  usersCount: number;
  prompt: string;
  spec: {
    overview: string;
    capabilities: string[];
    checklist: string[];
    sampleCommand: string;
    documentationUrl?: string;
  };
  author: {
    name: string;
    handle: string;
    isVerified: boolean;
  };
  createdAt: string;
}

export const VERIFIED_SKILLS: SkillItem[] = [];

export async function getSkills(): Promise<SkillItem[]> {
  try {
    const approved = await prisma.skillSubmission.findMany({
      where: { status: "approved" },
      orderBy: { createdAt: "desc" },
      include: {
        submittedBy: { select: { name: true, email: true } },
      },
    });

    return approved.map((sub) => {
      const slug = sub.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const authorName = sub.submittedBy?.name || "Contributor";
      const handle = "@" + authorName.toLowerCase().replace(/[^a-z0-9]/g, "");

      const titleLower = sub.title.toLowerCase();
      let icon: SkillItem["icon"] = "test";
      if (titleLower.includes("flutter")) icon = "flutter";
      else if (sub.category === "security" || titleLower.includes("security") || titleLower.includes("snare")) icon = "shield";
      else if (titleLower.includes("browser") || titleLower.includes("playwright") || titleLower.includes("e2e")) icon = "browser";
      else if (sub.category === "design" || titleLower.includes("figma") || titleLower.includes("tailwind") || titleLower.includes("ui")) icon = "figma";
      else if (sub.category === "backend" || titleLower.includes("database") || titleLower.includes("postgres") || titleLower.includes("sql") || titleLower.includes("redis")) icon = "database";
      else if (titleLower.includes("accessibility") || titleLower.includes("a11y") || titleLower.includes("wcag")) icon = "a11y";
      else if (titleLower.includes("api") || titleLower.includes("graphql")) icon = "api";
      else if (sub.category === "marketing" || titleLower.includes("seo")) icon = "seo";

      return {
        id: sub.id,
        slug: slug || sub.id,
        title: sub.title,
        icon,
        category: (sub.category as SkillCategory) || "testing",
        categoryLabel: sub.categoryLabel || "Testing & QA",
        badge: "Verified",
        badgeColor: "emerald",
        description: sub.summary,
        tags: Array.isArray(sub.tags) ? (sub.tags as string[]) : [],
        usersCount: 1,
        prompt: sub.prompt,
        spec: {
          overview: sub.summary,
          capabilities: [
            "Deterministic lint and validation checks",
            "Zero false positive assertions",
            "Actionable agent instructions",
          ],
          checklist: [
            "Run automated verification commands",
            "Ensure 0 errors and zero regressions",
          ],
          sampleCommand: sub.sampleCommand || "npm run test",
          documentationUrl: sub.documentationUrl ?? undefined,
        },
        author: {
          name: authorName,
          handle,
          isVerified: true,
        },
        createdAt: sub.createdAt.toISOString(),
      };
    });
  } catch (error) {
    console.error("[skills] failed to load approved skills from db", error);
    return [];
  }
}

export async function getSkillBySlug(slug: string): Promise<SkillItem | undefined> {
  const skills = await getSkills();
  const normalized = slug.trim().toLowerCase();
  return skills.find(
    (skill) => skill.slug.toLowerCase() === normalized || skill.id.toLowerCase() === normalized
  );
}

export async function getSkillsByCategory(category: SkillCategory): Promise<SkillItem[]> {
  const skills = await getSkills();
  return skills.filter((skill) => skill.category === category);
}
