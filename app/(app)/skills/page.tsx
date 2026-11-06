import { getSkills } from "./skills-data";
import { SkillsDirectory } from "./skills-directory";

export const metadata = {
  title: "Agent Skills Library — Ziki",
  description:
    "Discover tested agent prompts, verification scripts, and security guardrails published by the community.",
};

export default async function SkillsPage() {
  const { skills, error } = await getSkills();

  return (
    <div className="mx-auto max-w-7xl">
      <SkillsDirectory skills={skills} loadError={error ?? undefined} />
    </div>
  );
}
