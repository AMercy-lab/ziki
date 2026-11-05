import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { currentTenantIdFor } from "@/lib/tenant-context";
import { getSkills } from "./skills-data";
import { SkillsDirectory, type AgentOption } from "./skills-directory";

export const metadata = {
  title: "Tools & Skills — Ziki",
  description:
    "Equip verified test runners, linters, and security guardrails directly onto your AI agents.",
};

export default async function SkillsPage() {
  const user = await requireUser();
  const tenantId = await currentTenantIdFor(user.id);

  let rawAgents: {
    id: string;
    name: string;
    avatar: string | null;
    model: string | null;
    level: string | null;
    revokedAt: Date | null;
  }[] = [];

  try {
    if (tenantId) {
      rawAgents = await prisma.agent.findMany({
        where: { ownerUserId: user.id, tenantId },
        orderBy: [{ revokedAt: { sort: "desc", nulls: "first" } }, { createdAt: "desc" }],
        select: {
          id: true,
          name: true,
          avatar: true,
          model: true,
          level: true,
          revokedAt: true,
        },
      });
    }
  } catch (error) {
    console.error("[skills] failed to load agents", error);
  }

  const activeAgents = rawAgents.filter((a) => !a.revokedAt);

  const agents: AgentOption[] = activeAgents.map((a) => ({
    id: a.id,
    name: a.name,
    avatar: a.avatar,
    model: a.model,
    level: a.level ?? undefined,
  }));

  const skills = await getSkills();

  return (
    <div className="mx-auto max-w-7xl">
      <SkillsDirectory skills={skills} agents={agents} userId={user.id} />
    </div>
  );
}
