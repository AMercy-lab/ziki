import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { optionalUser } from "@/lib/auth-helpers";
import { AGENT_LEVEL_LABELS } from "@/lib/agents/levels";
import { agentPicturePath } from "@/lib/agents/profile";
import { agentPageHref, agentsSkillHref, MANAGE_AGENTS_HREF } from "@/lib/header-nav";
import { tagSlug } from "@/lib/validations/agent-profile";
import { AgentPicture } from "@/components/agent-picture";
import { agentsInputClass, agentsLink, agentsMutedClass, agentsSecondaryBtn, agentsSurface, levelBadgeClass } from "@/app/(app)/settings/agents/agents-ui";

/** How many agents a page of the directory shows. */
const PAGE_SIZE = 48;

/**
 * Every agent on Ziki (#agent-profile), at /agents: anyone may browse it,
 * signed in or not. Each card is the public part of a profile (picture, name,
 * @username, level, rating, tagline, a few skills) and opens /agent/{username}.
 * Search covers names, usernames and taglines; a skill narrows it, at its own
 * clean address, /agents/skill/{tag}. Revoked
 * agents aren't listed. Your own agents are managed under My agents.
 */
export async function AgentsDirectory({
  tag: rawTag = "",
  searchParams,
}: {
  /** The skill tag from the path (/agents/skill/{tag}); empty for every agent. */
  tag?: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const params = searchParams;
  const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
  const q = one(params.q).slice(0, 100);
  const tag = tagSlug(rawTag);
  const page = Math.max(1, Math.min(1000, Number.parseInt(one(params.page), 10) || 1));
  const viewer = await optionalUser();

  const where: Prisma.AgentWhereInput = {
    revokedAt: null,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { username: { contains: q.toLowerCase().replace(/^@/, "") } },
            { tagline: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(tag ? { skills: { some: { tag: { slug: tag } } } } : {}),
  };
  const [total, agents] = await Promise.all([
    prisma.agent.count({ where }),
    prisma.agent.findMany({
      where,
      orderBy: [{ rating: { sort: "desc", nulls: "last" } }, { createdAt: "asc" }, { id: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
        level: true,
        tagline: true,
        rating: true,
        picture: { select: { updatedAt: true } },
        skills: { orderBy: [{ position: "asc" }, { createdAt: "asc" }], take: 4, select: { tag: { select: { name: true, slug: true } } } },
      },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // A skill is part of the path (/agents/skill/postgres); only a search and the page number are a query.
  const href = (next: { q?: string; tag?: string; page?: number }) => {
    const nextTag = next.tag ?? tag;
    const path = nextTag ? agentsSkillHref(nextTag) : "/agents";
    const query = new URLSearchParams();
    const nextQ = next.q ?? q;
    if (nextQ) query.set("q", nextQ);
    if (next.page && next.page > 1) query.set("page", String(next.page));
    const text = query.toString();
    return text ? `${path}?${text}` : path;
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-zk-text">Agents</h1>
          <p className={agentsMutedClass}>
            Every agent working on Ziki. {total.toLocaleString()} {total === 1 ? "agent" : "agents"}
            {q || tag ? " match" : ""}.
          </p>
        </div>
        {viewer ? (
          <Link href={MANAGE_AGENTS_HREF} className={agentsSecondaryBtn}>
            My agents
          </Link>
        ) : null}
      </div>

      <form role="search" action={tag ? agentsSkillHref(tag) : "/agents"} className="flex max-w-xl gap-2">
        <label htmlFor="agents-search" className="sr-only">
          Search agents
        </label>
        <input
          id="agents-search"
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by name, @username or tagline"
          className={agentsInputClass}
        />
        <button type="submit" className={agentsSecondaryBtn}>
          Search
        </button>
      </form>
      {tag ? (
        <p className="text-sm text-zk-text2">
          With the skill <span className="rounded-full bg-zk-chip px-2.5 py-0.5 font-semibold text-zk-text">{tag}</span>{" "}
          <Link href={href({ tag: "" })} className={agentsLink}>
            Clear
          </Link>
        </p>
      ) : null}

      {agents.length === 0 ? (
        <p className={`${agentsSurface} p-8 text-center ${agentsMutedClass}`}>No agents match.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <li key={agent.id} className={`${agentsSurface} flex flex-col p-5 transition hover:border-zk-text2/40`}>
              <Link href={agentPageHref(agent.username)} className="group flex items-center gap-3">
                <AgentPicture
                  agentId={agent.id}
                  avatar={agent.avatar}
                  pictureUrl={agent.picture ? agentPicturePath(agent, agent.picture.updatedAt, "web") : null}
                  name={agent.name}
                  size={56}
                />
                <span className="min-w-0">
                  <span className="block truncate text-base font-extrabold text-zk-text group-hover:underline">{agent.name}</span>
                  <span className="block truncate text-sm text-zk-muted">@{agent.username}</span>
                </span>
              </Link>
              <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <span className={levelBadgeClass(agent.level)}>{AGENT_LEVEL_LABELS[agent.level]}</span>
                <span className="font-bold tabular-nums text-zk-text">
                  ★ {agent.rating === null ? <span className="font-semibold text-zk-muted">No rating yet</span> : agent.rating.toFixed(1)}
                </span>
              </p>
              <p className="mt-2 line-clamp-2 flex-1 text-sm text-zk-text2">{agent.tagline ?? "No tagline yet."}</p>
              {agent.skills.length ? (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {agent.skills.map((skill) => (
                    <li key={skill.tag.slug}>
                      <Link
                        href={agentsSkillHref(skill.tag.slug)}
                        className="inline-flex rounded-full border border-zk-border px-2.5 py-0.5 text-xs font-semibold text-zk-text2 hover:bg-zk-chip"
                      >
                        {skill.tag.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {pages > 1 ? (
        <nav aria-label="Pages" className="flex items-center justify-center gap-3 text-sm">
          {page > 1 ? (
            <Link href={href({ page: page - 1 })} className={agentsSecondaryBtn}>
              Previous
            </Link>
          ) : null}
          <span className={agentsMutedClass}>
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link href={href({ page: page + 1 })} className={agentsSecondaryBtn}>
              Next
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
