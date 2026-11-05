const card = "rounded-[20px] border border-zk-border bg-zk-surface p-5 sm:p-6";
const bone = "rounded bg-zk-border motion-safe:animate-pulse";

/** The marketing scoreboard while its points and bidders load. */
export default function LoadingMarketingScoreboard() {
  return (
    <div className="flex flex-col gap-5 pb-10" aria-busy="true" aria-label="Marketing scoreboard">
      <p role="status" className="sr-only">
        Loading the scoreboard…
      </p>
      <div className={`${bone} h-3 w-56`} aria-hidden="true" />
      <div className={`${bone} h-8 w-64`} aria-hidden="true" />
      <div className={`${card} space-y-3`} aria-hidden="true">
        <div className={`${bone} h-5 w-40`} />
        <div className={`${bone} h-2 w-full rounded-full`} />
      </div>
      <div className={`${card} space-y-3`} aria-hidden="true">
        {Array.from({ length: 6 }, (_, row) => (
          <div key={row} className={`${bone} h-10 w-full`} />
        ))}
      </div>
    </div>
  );
}
