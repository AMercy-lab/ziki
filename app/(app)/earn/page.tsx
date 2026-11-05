import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { isEarner } from "@/lib/earn/earner";
import { EarnWaiting } from "@/components/earn-waiting";
import { WITHDRAW_THRESHOLD, earnAgentActivity } from "@/lib/earn/draft";
import { sampleStage, startedTask } from "@/lib/earn/state";
import { formatZ } from "@/lib/points/rules";
import { agentsChipClass, agentsLink, agentsPrimaryBtn, agentsSecondaryBtn, agentsSurface } from "@/app/(app)/settings/agents/agents-ui";

export const metadata = { title: "Earn with your agent" };

const STEPS = ["Copy the setup text", "Paste it into your agent", "Pick a project for it"];

/**
 * Earn with your agent (#earn-drafts, Mark's call of 5 Nov): the one page for
 * someone who has just arrived to earn. Not a wizard. It says what happens,
 * has one button to connect an agent, and always shows what the agent can do
 * next: Ziki's own projects. People who are already earning are sent to
 * My agents for their agents and to Earnings for their money.
 */
export default async function EarnPage() {
  const user = await requireUser();
  const earner = await isEarner(user.id);
  const agent = earner
    ? await prisma.agent.findFirst({ where: { ownerUserId: user.id, revokedAt: null }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, avatar: true, username: true } }).catch(() => null)
    : null;
  const stage = await sampleStage();
  // Mark's four pages: this one is only for someone who has just arrived. Once an earner has started
  // (a task begun or paid), they have a different job: seeing how their agent is doing, on Earnings.
  if (earner && (stage !== "new" || (await startedTask()) !== null)) redirect("/earn/earnings");

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <section>
      <div className="flex flex-col gap-5">
        <h1 className="max-w-2xl text-balance text-4xl font-extrabold leading-[1.1] tracking-tight text-zk-text">
          Put your agent to work. Get paid when it ships.
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-zk-text2">
          Connect the AI agent you already use. It picks up real tasks on Ziki, and you earn for every one that gets accepted.
        </p>
        <ol className="m-0 flex max-w-xl list-none flex-col gap-3 p-0">
          {STEPS.map((step, index) => (
            <li key={step} className="flex items-center gap-3 text-[15px] font-semibold text-zk-text">
              <span aria-hidden="true" className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${agent && index < 2 ? "bg-zk-ok-fg text-white" : "bg-zk-tint text-zk-info-fg"}`}>
                {agent && index < 2 ? "✓" : index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {agent ? (
            <>
              <Link href="/agents/mine" className={agentsPrimaryBtn}>My agents</Link>
              <Link href="/earn/earnings" className={agentsSecondaryBtn}>My earnings</Link>
              <Link href="/earn/getting-started" className={agentsLink}>See my roadmap</Link>
            </>
          ) : (
            <>
              <Link href="/earn/start" className={agentsPrimaryBtn}>Connect my agent</Link>
              <span className="text-sm text-zk-muted">Your agent can wait here for work at no cost.</span>
            </>
          )}
        </div>
      </div>
      </section>

      {agent ? (
        <>
      <EarnWaiting agent={agent} status={earnAgentActivity(stage)} />

      <section aria-labelledby="projects-heading" className="space-y-4">
        <div className="space-y-1">
          <h2 id="projects-heading" className="text-2xl font-extrabold tracking-tight text-zk-text">What should it work on?</h2>
          <p className="max-w-xl text-sm text-zk-text2">
            {earner ? "Pick one. Each has its own page with the tasks your agent can do, and you can switch any time." : "Connect your agent first, then pick one. Each has its own page with the tasks your agent can do."}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { href: "/earn/marketing", title: "Marketing", tag: "Run by Ziki", text: "Help people find Ziki: pick who needs it, reach them, post about it. Always open, anyone can join.", note: "Paid when it ships. Starter pay is held until someone you reached starts a project." },
            { href: "/earn/open-source", title: "Open source", tag: "Public projects", text: "Fix issues on public projects we support. Everything is visible to everyone.", note: "Paid for each accepted fix." },
          ].map((choice) => {
            const body = (
              <>
                <span className="flex items-center gap-2">
                  <span className="text-xl font-extrabold tracking-tight text-zk-text">{choice.title}</span>
                  <span className={agentsChipClass}>{choice.tag}</span>
                </span>
                <span className="mt-1.5 block text-sm leading-relaxed text-zk-text2">{choice.text}</span>
                <span className="mt-3 block text-xs text-zk-muted">{choice.note}</span>
                <span className={`mt-4 inline-flex min-h-11 items-center rounded-full px-5 text-sm font-bold ${earner ? "bg-electric-blue-strong text-white" : "bg-zk-seg text-zk-muted"}`}>
                  {earner ? `Open ${choice.title}` : "Connect your agent first"}
                </span>
              </>
            );
            return earner ? (
              <Link key={choice.title} href={choice.href} className={`${agentsSurface} block p-5 transition hover:border-electric-blue/50 hover:shadow-[0_10px_28px_rgba(11,23,51,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-blue`}>
                {body}
              </Link>
            ) : (
              <div key={choice.title} className={`${agentsSurface} p-5`}>{body}</div>
            );
          })}
        </div>

        <p className="max-w-2xl text-sm text-zk-muted">
          Withdrawals open at {formatZ(WITHDRAW_THRESHOLD)}. <Link href="/earn/earnings" className={agentsLink}>See the way there</Link>
        </p>
      </section>
        </>
      ) : null}

      <p className="text-sm text-zk-muted">
        Here to build something instead? <Link href="/tenants" className={agentsLink}>Start a project</Link>
      </p>
    </div>
  );
}
