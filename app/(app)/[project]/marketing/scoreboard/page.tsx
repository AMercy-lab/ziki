import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { requireProject } from "@/lib/project-route";
import { marketingPath } from "@/lib/project-paths";
import { buildPointsSeries, type PointsGranularity, WEEKLY_POINTS_TARGET } from "@/lib/points/history";
import { formatZ as money, pointsNumber } from "@/lib/points/rules";
import { Avatar } from "@/components/avatar";
import { cn } from "@/lib/utils";

/** `/<slug>/marketing/scoreboard`: marketing scoreboard with leaderboard, bidders tab, and weekly target progress. */
export default async function MarketingScoreboardPage({ params }: { params: Promise<{ project: string }> }) {
  const { project: slug } = await params;
  await requireProject(slug, marketingPath(slug));
  const user = await requireUser();

  // Mock data for marketing scoreboard - will be replaced with real API data
  const mockPeriods = ["week", "month", "all time"] as const;
  const mockCurrentPeriod: "week" = "week"; // default to week

  // Mock leaderboard data - in production, this would come from the API
  const mockLeaderboard = [
    { userId: "user1", name: "Alice Johnson", image: "/images/avatars/1.png", points: 850, solvedTasks: 12, role: "worker" as const },
    { userId: "user2", name: "Bob Smith", image: "/images/avatars/2.png", points: 720, solvedTasks: 9, role: "worker" as const },
    { userId: "user3", name: "Carol Davis", image: "/images/avatars/3.png", points: 680, solvedTasks: 11, role: "worker" as const },
    { userId: "user4", name: "Dave Wilson", image: "/images/avatars/4.png", points: 540, solvedTasks: 7, role: "worker" as const },
    { userId: "user5", name: "Eve Brown", image: "/images/avatars/5.png", points: 490, solvedTasks: 5, role: "worker" as const },
  ];

  // Mock points history for weekly chart
  const mockWeeklyHistory = [
    { createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), points: 45 },
    { createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), points: 52 },
    { createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), points: 38 },
    { createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), points: 61 },
    { createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), points: 47 },
    { createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), points: 55 },
    { createdAt: new Date(), points: 42 },
  ];

  // Mock bidders data
  const mockBidders = [
    { userId: "user1", name: "Alice Johnson", bids: 5, active: true },
    { userId: "user2", name: "Bob Smith", bids: 3, active: false },
    { userId: "user3", name: "Carol Davis", bids: 7, active: true },
  ];

  // Mock weekly target progress
  const mockWeeklyProgress = {
    current: 380,
    target: WEEKLY_POINTS_TARGET, // 500
    percentage: Math.round((380 / WEEKLY_POINTS_TARGET) * 100),
  };

  // Handle period change
  const periodOptions = [
    { value: "week", label: "This Week", description: "Points earned this week" },
    { value: "month", label: "This Month", description: "Points earned this month" },
    { value: "all", label: "All Time", description: "Total points earned" },
  ];

  return (
    <div className="min-h-screen bg-zk-background">
      <nav className="border-b border-zk-border bg-zk-surface/50">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1Z" />
              <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
            </svg>
            <span className="text-zk-heading large">Marketing Scoreboard</span>
          </div>
          <div className="flex items-center gap-2">
            {periodOptions.map((opt) => (
              <Link
                key={opt.value}
                href={`/project/${slug}/marketing/scoreboard?period=${opt.value}`}
                className={cn(
                  "rounded-md border border-zk-border px-3 py-1.5 text-sm font-medium text-zk-text hover:bg-zk-chip transition-colors",
                  mockCurrentPeriod === opt.value ? "bg-zk-primary text-zk-white" : ""
                )}
              >
                {opt.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto p-4">
        {/* Leaderboard Section */}
        <section className="mb-6">
          <h2 className="text-zk-heading-medium mb-4">Marketing Leaders</h2>
          <div className="overflow-x-auto">
            <table className="w-full rounded-md border border-zk-border">
              <thead>
                <tr className="border-b border-zk-border2">
                  <th className="text-left text-sm font-medium text-zk-text2 px-4 py-3">Rank</th>
                  <th className="text-left text-sm font-medium text-zk-text2 px-4 py-3">User</th>
                  <th className="text-right text-sm font-medium text-zk-text2 px-4 py-3">Points</th>
                  <th className="text-left text-sm font-medium text-zk-text2 px-4 py-3">Solved Tasks</th>
                </tr>
              </thead>
              <tbody>
                {mockLeaderboard.map((entry, index) => (
                  <tr key={entry.userId} className="hover:bg-zk-surface/50">
                    <td className="text-center text-sm font-medium text-zk-text px-4 py-3">{index + 1}</td>
                    <td className="flex items-center px-4 py-3">
                      <Avatar size={32} src={entry.image} alt={entry.name} className="mr-3" />
                      <span>{entry.name}</span>
                    </td>
                    <td className="text-right text-sm font-medium text-zk-text px-4 py-3">{pointsNumber(entry.points)}</td>
                    <td className="text-center text-sm font-medium text-zk-text2 px-4 py-3">{entry.solvedTasks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Weekly Target Progress */}
        <section className="mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-zk-heading-small mb-2">Weekly Target Progress</h3>
              <p className="text-zk-text2">
                {mockWeeklyProgress.current} / {pointsNumber(mockWeeklyProgress.target)} points
              </p>
            </div>
            <div className="w-full h-2 rounded-full bg-zk-surface/50 overflow-hidden">
              <div
                className={`h-full rounded-full bg-zk-primary transition-all duration-500 ease-in-out ${mockWeeklyProgress.percentage >= 100 ? "bg-zk-success" : ""}`}
                style={{ width: `${mockWeeklyProgress.percentage}%` }}
                aria-valuemin="0"
                aria-valuemax={100}
                aria-valuenow={mockWeeklyProgress.percentage}
              />
            </div>
            <p className="text-zk-text2 text-right">
              {mockWeeklyProgress.percentage}% complete
            </p>
          </div>
        </section>

        {/* Bidders Tab */}
        <section>
          <h2 className="text-zk-heading-medium mb-4">Active Bidders</h2>
          <div className="overflow-x-auto">
            <table className="w-full rounded-md border border-zk-border">
              <thead>
                <tr className="border-b border-zk-border2">
                  <th className="text-left text-sm font-medium text-zk-text2 px-4 py-3">Bidder</th>
                  <th className="text-center text-sm font-medium text-zk-text2 px-4 py-3">Bids</th>
                  <th className="text-left text-sm font-medium text-zk-text2 px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {mockBidders.map((bidder) => (
                  <tr key={bidder.userId} className="hover:bg-zk-surface/50">
                    <td className="flex items-center px-4 py-3">
                      <Avatar size={24} src={"/images/avatars/placeholder.png"} alt={bidder.name} className="mr-3" />
                      <span>{bidder.name}</span>
                    </td>
                    <td className="text-center text-sm font-medium text-zk-text px-4 py-3">{bidder.bids}</td>
                    <td className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium",
                      bidder.active ? "text-zk-success bg-zk-success/10" : "text-zk-muted bg-zk-chip/10"
                    )}>
                      {bidder.active ? "Active" : "Inactive"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
