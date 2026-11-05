import { formatZ } from "@/lib/points/rules";
import { CONVERSION_BONUS, WITHDRAW_THRESHOLD, type EarnBalance } from "@/lib/earn/draft";

/**
 * One bar to $30 (#earn-drafts): what you've earned in green, what's still
 * locked in amber beside it, ending at the $30 mark. Under it, both amounts
 * in words.
 */
export function EarnBar({ balance }: { balance: Pick<EarnBalance, "earned" | "tasksLeft"> }) {
  // Before anything is earned: the empty bar and "$0 earned", with no breakdown of what each part pays yet.
  if (balance.earned === 0) {
    return (
      <div>
        <div role="img" aria-label={`Nothing earned yet. Withdraw opens at ${formatZ(WITHDRAW_THRESHOLD)}.`} className="h-2.5 rounded-full bg-zk-seg" />
        <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-zk-text2">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-zk-ok-fg" />
          <span className="font-bold text-zk-text">{formatZ(0)}</span> earned
        </p>
      </div>
    );
  }
  const left = Math.max(0, WITHDRAW_THRESHOLD - balance.earned);
  const fromTasks = Math.min(balance.tasksLeft, left);
  const fromPerson = left - fromTasks;
  // Three parts on one bar: earned (green), still to earn from tasks (blue), and the part a person starting pays (amber).
  const parts = [
    { key: "earned", value: Math.min(balance.earned, WITHDRAW_THRESHOLD), bar: "bg-zk-ok-fg", dot: "bg-zk-ok-fg", text: "font-bold text-zk-text", label: "earned" },
    { key: "tasks", value: fromTasks, bar: "border border-electric-blue/30 bg-zk-tint", dot: "border border-electric-blue/40 bg-zk-tint", text: "font-bold text-zk-accent", label: "from your tasks" },
    { key: "person", value: fromPerson, bar: "border border-zk-warn-bd bg-zk-warn-bg", dot: "border border-zk-warn-bd bg-zk-warn-bg", text: "font-bold text-zk-warn-fg", label: "when someone you reached starts a project" },
  ];
  const shown = parts.filter((part) => part.value > 0);
  return (
    <div>
      <div
        role="img"
        aria-label={
          left > 0
            ? `${formatZ(balance.earned)} earned. ${fromTasks ? `${formatZ(fromTasks)} to come from your tasks. ` : ""}${formatZ(fromPerson)} when someone you reached starts a project. Withdraw opens at ${formatZ(WITHDRAW_THRESHOLD)}.`
            : `${formatZ(balance.earned)} earned. Withdraw is open.`
        }
        className="flex h-2.5 gap-[3px]"
      >
        {shown.map((part, i) => (
          <div
            key={part.key}
            className={`h-full ${part.bar} ${i === 0 ? "rounded-l-full" : ""} ${i === shown.length - 1 ? "rounded-r-full" : ""}`}
            style={{ flex: `${part.value} 1 0%` }}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zk-text2">
        {parts.map((part) =>
          part.key === "earned" || part.value > 0 ? (
            <span key={part.key} className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className={`h-2 w-2 rounded-full ${part.dot}`} />
              <span className={part.text}>{formatZ(part.key === "earned" ? balance.earned : part.key === "person" ? CONVERSION_BONUS : part.value)}</span> {part.label}
            </span>
          ) : null,
        )}
      </div>
    </div>
  );
}
