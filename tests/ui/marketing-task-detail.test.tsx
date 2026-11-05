// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ addComment: vi.fn() }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "dave" } })) }));
vi.mock("@/app/actions/issues", () => ({ addCommentAction: mocks.addComment }));
vi.mock("@/app/actions/issue-bids", () => ({ awardIssueBidAction: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/ziki/42",
}));

import { MarketingTaskHeader } from "@/components/marketing/marketing-task-header";
import { MarketingDeliverablesPanel, type MarketingDeliveryView } from "@/components/marketing/marketing-deliverables-panel";
import { MarketingReviewsPanel, type MarketingReviewView } from "@/components/marketing/marketing-reviews-panel";
import { MarketingTaskDetail } from "@/components/marketing/marketing-task-detail";

afterEach(() => cleanup());

describe("MarketingTaskHeader (M-UI-4)", () => {
  it("renders marketing badge, type, reward, revision counter, focus, rationale and no PR elements", () => {
    render(
      <MarketingTaskHeader
        number={42}
        title="Launch Product Hunt Teaser Video"
        description="Produce a 60-second teaser video highlighting Ziki's teal brand aesthetic."
        status="in_progress"
        substatus="in_progress"
        taskType={{ id: "t1", name: "Video Production" }}
        reward={250}
        revisionCount={1}
        maxRevisions={2}
        projectSlug="ziki"
        projectName="Ziki"
        projectFocus="Boost developer awareness for Ziki 2.0 launch"
        projectSiteUrl="https://ziki.dev"
        rationale="Product Hunt launch requires strong multimedia visual hooks to drive upvotes."
        reporter={{ name: "Fabian Muoghalu", email: "fabbenco97@gmail.com" }}
        createdAt={new Date("2026-11-01T12:00:00Z")}
      />
    );

    // Number & Title
    expect(screen.getByText("#42")).toBeInTheDocument();
    expect(screen.getByText("Launch Product Hunt Teaser Video")).toBeInTheDocument();

    // Marketing badge & Task Type
    const marketingBadge = screen.getByRole("link", { name: "Marketing" });
    expect(marketingBadge).toHaveAttribute("href", "/ziki/marketing/tasks");
    expect(screen.getByText("Video Production")).toBeInTheDocument();

    // Reward in formatZ ($250)
    expect(screen.getByText("$250")).toBeInTheDocument();

    // Revision Counter
    expect(screen.getByText("Revision 1 of 2")).toBeInTheDocument();

    // Campaign Focus & Site Link
    expect(screen.getByText("Ziki Focus")).toBeInTheDocument();
    expect(screen.getByText("Boost developer awareness for Ziki 2.0 launch")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Visit Site ↗" })).toHaveAttribute("href", "https://ziki.dev");

    // Strategic Rationale
    expect(screen.getByText("Strategic Rationale")).toBeInTheDocument();
    expect(screen.getByText("Product Hunt launch requires strong multimedia visual hooks to drive upvotes.")).toBeInTheDocument();

    // Crucial requirement: No Git PR or commit elements
    expect(screen.queryByText(/PR #/)).toBeNull();
    expect(screen.queryByText(/commit/i)).toBeNull();
    expect(screen.queryByText(/staging/i)).toBeNull();
  });
});

describe("MarketingDeliverablesPanel (M-UI-4)", () => {
  const deliveries: MarketingDeliveryView[] = [
    {
      id: "del-1",
      agentName: "Creative Claude",
      by: "Fabian",
      summary: "Teaser video render and social banner assets",
      description: "Final 1080p MP4 uploaded to Figma & Drive with copy captions.",
      deliverableUrls: ["https://figma.com/design/sample123", "https://drive.google.com/file/d/sample456"],
      screenshots: [],
      updatedAt: new Date("2026-11-02T10:00:00Z"),
      replies: [],
    },
  ];

  it("renders delivered external links, domain pills, author info and summary", () => {
    render(
      <MarketingDeliverablesPanel
        bugId="bug-1"
        deliveries={deliveries}
        isInProgress={false}
        canReply={true}
      />
    );

    expect(screen.getByRole("heading", { name: /Deliverables/ })).toBeInTheDocument();
    expect(screen.getByText("Creative Claude")).toBeInTheDocument();
    expect(screen.getByText("for Fabian")).toBeInTheDocument();
    expect(screen.getByText("Teaser video render and social banner assets")).toBeInTheDocument();

    // External deliverable links
    const figmaLink = screen.getByRole("link", { name: /figma\.com/ });
    expect(figmaLink).toHaveAttribute("href", "https://figma.com/design/sample123");
    expect(screen.getByText("figma.com")).toBeInTheDocument();
    expect(screen.getByText("drive.google.com")).toBeInTheDocument();
  });

  it("shows in-progress state when work is claimed and being produced", () => {
    render(
      <MarketingDeliverablesPanel
        bugId="bug-1"
        deliveries={[]}
        isInProgress={true}
        workerName="Creative Claude (for Fabian)"
        canReply={false}
      />
    );

    expect(screen.getByText(/Work is in progress/)).toBeInTheDocument();
    expect(screen.getByText(/Deliverables will appear here once submitted/)).toBeInTheDocument();
  });
});

describe("MarketingReviewsPanel (M-UI-4)", () => {
  const reviews: MarketingReviewView[] = [
    {
      id: "rev-1",
      agentName: "Reviewer Bot",
      by: "Aaoron",
      goodToMerge: true,
      summary: "Approved: Visuals match brand guidelines.",
      description: "Checked color contrast and logo placement against teal guidelines.",
      updatedAt: new Date("2026-11-03T14:00:00Z"),
      replies: [],
    },
    {
      id: "rev-2",
      agentName: "Design Critic",
      by: "Bolu",
      goodToMerge: false,
      summary: "Changes Requested: Audio mixing is too low in first 10s.",
      description: "Please normalize background audio track to -14 LUFS.",
      updatedAt: new Date("2026-11-03T15:00:00Z"),
      replies: [],
    },
  ];

  it("renders approved and changes requested verdicts with counts and details", () => {
    render(
      <MarketingReviewsPanel
        bugId="bug-1"
        reviews={reviews}
        revisionCount={0}
        maxRevisions={2}
        canReply={true}
      />
    );

    expect(screen.getByRole("heading", { name: /Peer Reviews & Verdicts/ })).toBeInTheDocument();
    expect(screen.getByText("1 Approved")).toBeInTheDocument();
    expect(screen.getByText("1 Changes Requested")).toBeInTheDocument();
    expect(screen.getByText("Round 1 of 2")).toBeInTheDocument();

    expect(screen.getByText("Approved: Visuals match brand guidelines.")).toBeInTheDocument();
    expect(screen.getByText("Changes Requested: Audio mixing is too low in first 10s.")).toBeInTheDocument();
  });
});

describe("MarketingTaskDetail full integration (M-UI-4)", () => {
  it("renders the entire marketing task layout and respects quiet Teal design", () => {
    render(
      <MarketingTaskDetail
        bug={{
          id: "bug-mkt-1",
          number: 101,
          title: "Write Q4 Launch Thread on X",
          description: "Draft 8-tweet thread explaining Ziki's agentic coordination model.",
          status: "in_progress",
          substatus: "in_progress",
          reward: 500,
          revisionCount: 1,
          createdAt: new Date("2026-11-04T00:00:00Z"),
          type: { id: "t2", name: "Social Copy" },
          reporter: { name: "Fabian Muoghalu", email: "fabbenco97@gmail.com" },
          project: {
            slug: "ziki",
            name: "Ziki",
            goal: "Scale open-source agentic coordination",
            siteUrl: "https://ziki.dev",
          },
          idea: {
            id: "idea-1",
            number: 12,
            rationale: "High impressions from thought-leadership threads convert to active GitHub stars.",
          },
        }}
        revisionLimit={2}
        hold={{
          id: "hold-1",
          status: "active",
          agentName: "Copy Agent",
          personName: "Fabian",
          offeredAt: new Date("2026-11-04T01:00:00Z"),
          deadline: new Date("2026-11-04T05:00:00Z"),
        }}
        deliveries={[]}
        reviews={[]}
        bidsSlot={<div data-testid="bids-slot">Bids Slot</div>}
        commentsSlot={<div data-testid="comments-slot">Comments Slot</div>}
        sideRailSlot={<div data-testid="side-rail-slot">Side Rail Slot</div>}
        canReply={true}
      />
    );

    expect(screen.getByTestId("marketing-task-detail")).toBeInTheDocument();
    expect(screen.getAllByText("#101").length).toBe(2);
    expect(screen.getByText("Write Q4 Launch Thread on X")).toBeInTheDocument();
    expect(screen.getByText("Social Copy")).toBeInTheDocument();
    expect(screen.getByText("$500")).toBeInTheDocument();
    expect(screen.getByText(/Revision 1 of 2/)).toBeInTheDocument();

    // Verify slots render properly
    expect(screen.getByTestId("bids-slot")).toBeInTheDocument();
    expect(screen.getByTestId("comments-slot")).toBeInTheDocument();
    expect(screen.getByTestId("side-rail-slot")).toBeInTheDocument();
  });
});
