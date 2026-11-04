import type { Status, Substatus, WorkTrack } from "@prisma/client";
import { ENTRY_SUBSTATUS } from "@/lib/issue-substatus";

/**
 * Which rules an idea or issue follows, by its track
 * (docs/marketing-migration-plan.md, "The marketing track rules"). This is the
 * one place that decides, so routes ask here instead of branching on `track`.
 */

/** Filters a query to product work: lists, counts and feeds that aren't about marketing. */
export const PRODUCT_TRACK = { track: "product" } as const;

export type TrackRules = {
  /** Where converting an idea puts the issue. */
  convertsTo: Substatus;
  /** When the reporter is paid: when the issue is confirmed, or when the idea converts. */
  reporterPaidOn: "confirmation" | "conversion";
  /** Whether a delivery needs a pull request. */
  needsPullRequest: boolean;
  /** Where a manager's accept moves the issue. */
  acceptMovesTo: Substatus;
};

const PRODUCT_RULES: TrackRules = {
  convertsTo: "requires_confirmation",
  reporterPaidOn: "confirmation",
  needsPullRequest: true,
  acceptMovesTo: "ready_to_merge",
};

const MARKETING_RULES: TrackRules = {
  convertsTo: "open",
  reporterPaidOn: "conversion",
  needsPullRequest: false,
  acceptMovesTo: "published",
};

export function trackRules(track: WorkTrack): TrackRules {
  return track === "marketing" ? MARKETING_RULES : PRODUCT_RULES;
}

export type SendBack = {
  substatus: Substatus;
  /** Whether the claim stays with the same worker. If not, it is released and the issue reopens for bids. */
  keepsClaim: boolean;
  revisionCount: number;
};

/**
 * Where work goes when it is sent back: enough "not good" judgements, or a
 * manager's reject.
 *
 * Product: judgements send it back to Open for someone else, and a reject sends
 * it back to In progress. Marketing: both use up a revision round and return it
 * to the same worker; once the rounds are used up it reopens for bids, and the
 * next worker starts with a fresh count.
 */
export function afterSendBack(
  issue: { track: WorkTrack; revisionCount: number },
  revisionLimit: number,
  via: "judgement" | "manager_reject",
): SendBack {
  if (issue.track !== "marketing") {
    return via === "judgement"
      ? { substatus: "open", keepsClaim: false, revisionCount: issue.revisionCount }
      : { substatus: "in_progress", keepsClaim: true, revisionCount: issue.revisionCount };
  }
  if (issue.revisionCount < revisionLimit) {
    return { substatus: "in_progress", keepsClaim: true, revisionCount: issue.revisionCount + 1 };
  }
  return { substatus: "open", keepsClaim: false, revisionCount: 0 };
}

/**
 * Whether a judgement counts towards the current delivery. Product judgements
 * count on the pull request they tested. Marketing work has none, so only
 * judgements given since the latest delivery count.
 */
export function judgementCounts(
  track: WorkTrack,
  judgement: { updatedAt: Date; pullRequestUrl: string | null },
  delivery: { updatedAt: Date; pullRequestUrl: string | null },
): boolean {
  if (track !== "marketing") return judgement.pullRequestUrl === delivery.pullRequestUrl;
  return judgement.updatedAt >= delivery.updatedAt;
}

/** Where a reopened issue goes. Marketing issues have no confirmation step to return to. */
export function reopenSubstatus(track: WorkTrack, confirmed: boolean): Substatus {
  return track === "marketing" || confirmed ? "open" : "requires_confirmation";
}

/** The substatus an issue gets when a person moves it to a main status. Marketing work goes Live as Published. */
export function entrySubstatus(track: WorkTrack, status: Status): Substatus {
  return track === "marketing" && status === "resolved" ? "published" : ENTRY_SUBSTATUS[status];
}
