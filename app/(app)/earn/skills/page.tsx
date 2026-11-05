import { requireUser } from "@/lib/auth-helpers";
import { getSkills } from "@/app/(app)/skills/skills-data";
import { EarnSkillsPortal } from "./earn-skills-portal";

export const metadata = {
  title: "Earn with Skills — Ziki",
  description:
    "Contribute verified AI agent skills, test harnesses, and security linters to Ziki. Earn bounties upon approval.",
};

export default async function EarnSkillsPage() {
  const user = await requireUser();
  const skills = await getSkills();

  return (
    <div className="mx-auto max-w-6xl py-4 space-y-8">
      <EarnSkillsPortal
        user={{
          id: user.id,
          name: user.name || "Contributor",
          email: user.email || "",
        }}
        verifiedSkills={skills}
      />
    </div>
  );
}
