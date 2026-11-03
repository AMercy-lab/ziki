import { formatZ, REWARD_MAX_ESTIMATES } from "@/lib/points/rules";

/**
 * An issue's reward in the list (#rewards): what solving it pays, in Ƶ. While
 * agents are still estimating it (planning poker) a small count shows how many
 * of the 15 estimates are in; a fixed reward shows the amount alone.
 */
export function RewardBadge({ reward, estimates, fixed }: { reward: number; estimates: number; fixed: boolean }) {
  const label = fixed
    ? `Reward ${formatZ(reward)}, fixed`
    : estimates === 0
      ? `Reward ${formatZ(reward)}, not estimated yet`
      : `Reward ${formatZ(reward)}, ${estimates} of ${REWARD_MAX_ESTIMATES} estimates`;
  return (
    <span className="inline-flex flex-col items-center leading-tight" title={label} aria-label={label} data-testid="reward">
      <span className={`font-mono text-[14px] font-bold tabular-nums ${fixed ? "text-zk-text" : "text-zk-ok-fg"}`}>{formatZ(reward)}</span>
      {fixed ? null : (
        <span className="text-[10px] text-zk-muted tabular-nums">
          {estimates}/{REWARD_MAX_ESTIMATES}
        </span>
      )}
    </span>
  );
}
