"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { copyText } from "@/lib/clipboard";
import { checkAgentConnectedAction, startAgentConnectAction } from "@/app/(app)/settings/agents/connect/actions";
import { DancingAgent } from "@/app/(app)/settings/agents/connect/connect-agent-flow";
import { agentsInputClass, agentsLabelClass, agentsMutedClass, agentsPrimaryBtn, agentsSecondaryBtn } from "@/app/(app)/settings/agents/agents-ui";

type Step = "name" | "copy" | "waiting" | "connected";

const RAIL = [
  { key: "name", label: "Name it" },
  { key: "copy", label: "Copy the text" },
  { key: "waiting", label: "Connected" },
] as const;

/** How often we ask whether the agent has called in. */
const POLL_MS = 2000;
/** How long the dancing agent stays up before the page moves on. */
const MOVE_ON_MS = 4500;

/**
 * Connecting an agent as part of earning (#earn-connect): the same four beats as everywhere else on Ziki
 * (name it, copy one piece of text, paste it into the agent, watch it connect), laid out on the page
 * instead of in a dialog, with the steps in view. Once connected it moves on to choosing what the agent works on.
 */
export function EarnConnect({ projectId, projectName }: { projectId: string; projectName: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [agent, setAgent] = useState<{ id: string; name: string; setupText: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const agentId = agent?.id;
  useEffect(() => {
    if (step !== "waiting" || !agentId) return;
    let cancelled = false;
    const check = async () => {
      const result = await checkAgentConnectedAction(agentId);
      if (!cancelled && result.connected) setStep("connected");
    };
    void check();
    const timer = setInterval(check, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [step, agentId]);

  useEffect(() => {
    if (step !== "connected") return;
    const timer = setTimeout(() => router.push("/earn?connected=1"), MOVE_ON_MS);
    return () => clearTimeout(timer);
  }, [step, router]);

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await startAgentConnectAction({ name: name.trim(), projectId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAgent({ id: result.agentId, name: result.name, setupText: result.setupText });
      setStep("copy");
    });
  }

  async function handleCopy() {
    if (!agent) return;
    const ok = await copyText(agent.setupText);
    setCopied(ok);
    setError(ok ? null : "Couldn't copy. Check your browser's clipboard permission and try again.");
  }

  const at = RAIL.findIndex((item) => item.key === (step === "connected" ? "waiting" : step));

  return (
    <div className="w-full space-y-6">
      <ol aria-label="Steps" className="m-0 flex list-none items-center justify-center gap-2 p-0 sm:gap-3">
        {RAIL.map((item, index) => {
          const done = index < at || step === "connected";
          const now = index === at && step !== "connected";
          return (
            <li key={item.key} className="flex items-center gap-2 sm:gap-3">
              <span className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${done ? "bg-zk-ok-bg text-zk-ok-fg" : now ? "bg-zk-info-bg text-zk-info-fg" : "bg-zk-chip text-zk-muted"}`}>
                <span aria-hidden="true" className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${done ? "bg-zk-ok-fg text-white" : now ? "bg-electric-blue-strong text-white" : "bg-zk-surface text-zk-muted"}`}>
                  {done ? "✓" : index + 1}
                </span>
                <span className="max-sm:hidden">{item.label}</span>
              </span>
              {index < RAIL.length - 1 ? <span aria-hidden="true" className={`h-0.5 w-5 rounded-full sm:w-8 ${done ? "bg-zk-ok-fg" : "bg-zk-seg"}`} /> : null}
            </li>
          );
        })}
      </ol>

      <section className="rounded-[24px] border border-zk-border bg-zk-surface p-6 shadow-[0_10px_32px_rgba(11,23,51,0.07)] sm:p-9">
        {step === "name" ? (
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="space-y-1.5 text-center">
              <h1 className="text-2xl font-extrabold tracking-tight text-zk-text sm:text-3xl">What should we call your agent?</h1>
              <p className={agentsMutedClass}>Use the name you already know it by. You can change it later.</p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="earn-agent-name" className={agentsLabelClass}>Agent name</label>
              <input
                id="earn-agent-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Claude"
                required
                // The page is for this one field.
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
                className={`${agentsInputClass} min-h-12 text-base`}
              />
            </div>
            {error ? <p role="alert" className="text-sm font-semibold text-zk-bad-fg">{error}</p> : null}
            <button type="submit" disabled={isPending || !name.trim()} className={`${agentsPrimaryBtn} w-full disabled:opacity-60`}>
              {isPending ? "Creating…" : "Continue"}
            </button>
            <p className="text-center text-xs text-zk-muted">It will work in {projectName}.</p>
          </form>
        ) : null}

        {step === "copy" && agent ? (
          <div className="space-y-5">
            <div className="space-y-1.5 text-center">
              <h1 className="text-2xl font-extrabold tracking-tight text-zk-text sm:text-3xl">Copy this into {agent.name}</h1>
              <p className={agentsMutedClass}>Paste it as your agent&apos;s first message. It holds its key, so it is only shown here once.</p>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-zk-border bg-zk-chip p-2 pl-4">
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-zk-text2" aria-hidden="true">{agent.setupText.split("\n")[0]}</span>
              <button
                type="button"
                onClick={handleCopy}
                className={`inline-flex h-10 shrink-0 items-center rounded-full px-5 text-sm font-bold text-white ${copied ? "bg-zk-ok-fg" : "bg-electric-blue-strong hover:bg-[#2552af]"}`}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            {error ? <p role="alert" className="text-sm font-semibold text-zk-bad-fg">{error}</p> : null}
            <button type="button" onClick={() => setStep("waiting")} disabled={!copied} className={`${agentsPrimaryBtn} w-full disabled:opacity-60`}>
              I&apos;ve pasted it
            </button>
          </div>
        ) : null}

        {step === "waiting" && agent ? (
          <div className="space-y-6 py-2 text-center" role="status">
            <span className="mx-auto block h-14 w-14 animate-spin rounded-full border-4 border-zk-tint border-t-electric-blue-strong motion-reduce:animate-none" aria-hidden="true" />
            <div className="space-y-1.5">
              <h1 className="text-2xl font-extrabold tracking-tight text-zk-text sm:text-3xl">Waiting for {agent.name}…</h1>
              <p className={agentsMutedClass}>This moves on by itself as soon as your agent connects.</p>
            </div>
            <button type="button" onClick={() => setStep("copy")} className={agentsSecondaryBtn}>Back to the text</button>
          </div>
        ) : null}

        {step === "connected" && agent ? (
          <div className="zk-dance-pop space-y-4 py-2 text-center" role="status">
            <DancingAgent />
            <div className="space-y-1.5">
              <h1 className="text-2xl font-extrabold tracking-tight text-zk-text sm:text-3xl">{agent.name} is connected</h1>
              <p className={agentsMutedClass}>Now pick what it works on.</p>
            </div>
            <Link href="/earn?connected=1" className={agentsPrimaryBtn}>Choose what it works on</Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}
