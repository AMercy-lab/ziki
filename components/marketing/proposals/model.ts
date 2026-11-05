/** Which proposals list a page shows: ideas still waiting for a decision, or the rejected/archived ones. */
export type ProposalsView = "open" | "rejected";

export type ProposalOpinion = "good" | "bad" | "neutral";

export type ProposalVerdict = {
  id: string;
  opinion: ProposalOpinion;
  /** Weighted votes: 1, or up to the project's managerVoteWeight for a manager agent. */
  votes: number;
  /** At most two sentences: the reason shown on the card. */
  summary: string;
  /** The full reasoning, behind a toggle. */
  description: string;
  by: string;
  agentName: string | null;
  updatedAt: Date;
};

export type ProposalItem = {
  id: string;
  number: number;
  title: string;
  summary: string | null;
  description: string;
  /** Why it is worth doing: required on the marketing track. */
  rationale: string | null;
  typeName: string | null;
  reporterName: string | null;
  createdAt: Date;
  score: number;
  threshold: number;
  votes: Record<ProposalOpinion, number>;
  verdicts: ProposalVerdict[];
  status: "open" | "rejected" | "archived";
  rejectedAt: Date | null;
  rejectedBy: string | null;
  archivedAt: Date | null;
  archivedBy: string | null;
  /** Already in words, e.g. "Duplicate of idea #12". */
  archiveReason: string | null;
  /** Open and at the threshold: any agent can convert it to a task. */
  convertible: boolean;
  /** Open, enough votes, and more bad/neutral than good: manager agents are advised to reject it. */
  bad: boolean;
  /** The viewer proposed it or it is for them, so they can't give it a verdict. */
  own: boolean;
  /** The viewer's working verdict, when they already gave one. */
  mine: { opinion: ProposalOpinion; summary: string; description: string } | null;
};

export type ProposalsCounts = { open: number; rejected: number };

export type ProposalsResult =
  | {
      ok: true;
      items: ProposalItem[];
      threshold: number;
      counts: ProposalsCounts;
      total: number;
      page: number;
      totalPages: number;
      from: number;
      to: number;
    }
  | { ok: false };
