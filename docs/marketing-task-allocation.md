# Amp to Ziki: Task Allocation & Acceptance Criteria

These are the Phase 1 tasks for bringing Amp into Ziki as the Marketing section of each project. The Phase 0 foundations are merged, so nobody is waiting on them.

---

## How this works

- **If "Relies on" says "Nothing", start now.** Every API task is in this group, so API owners are the first link in the chain. Other people can't finish until you deliver.
- **If you rely on someone, follow up with them directly and early.** Don't wait to be told their work is ready. Tell them what you need from their task, ask when it will be ready, and ask for the PR link.
- **Keep working while you wait.** Build against the contract and the fixtures (see "Where things are"), then connect the real route when your teammate's PR merges.
- **If "Waiting on you" names someone, keep them updated.** Share your PR as soon as it is open, and tell them straight away if your route's shape changes or your delivery date slips.
- **If you are blocked and your follow-up gets no answer, raise it with the team.** Don't wait quietly.

---

## Quick Reference Summary Table

| ID | Task | Owner | Relies on: follow up with | Waiting on you |
| :--- | :--- | :--- | :--- | :--- |
| **M-API-1** | Propose a marketing task | Michael Mickyhill | Nothing | Hafeezah (`M-UI-3`) |
| **M-API-2** | Vote → open / reject | Adele | Nothing | Peter Abah (`M-UI-2`) |
| **M-API-3** | Marketing delivery | Chizoba | Nothing | Fabian (`M-UI-4`) |
| **M-API-4** | Review and revision rounds | Aaoron wisdom | Nothing | Fabian (`M-UI-4`) |
| **M-API-5** | Accept → Live (published) | Aphoe | Nothing | Abdulmuiz, Adewumi Oluwasanmi (`M-UI-5`) |
| **M-API-6** | Marketing settings API | emmyanzo | Nothing | Kayinsola ogunwale, joshua emmanuel (`M-UI-7`) |
| **M-API-7** | Marketing task types API | Mikey | Nothing | Hafeezah (`M-UI-3`), Kayinsola & Joshua (`M-UI-7`) |
| **M-API-8** | Project brief for agents | Josemaria | Nothing | Kayinsola & Joshua (`M-UI-7`) |
| **M-API-9** | Work feed and events | Habeebraji | Nothing | Maryam, Emmanuel Orotayo (`M-UI-8`) |
| **M-API-10** | Scoreboard data | Oluwalayomi Olayinka | Nothing | Cynthia (`M-UI-6`) |
| **M-API-11** | Search | Rabiah Usman | Nothing | No UI task |
| **M-UI-1** | Tasks board | Abraham Bishop | Nothing | Bolu (`M-UI-9`) |
| **M-UI-2** | Proposals | Peter Abah | Adele (`M-API-2`) | Bolu (`M-UI-9`) |
| **M-UI-3** | New marketing task form | Hafeezah | Michael Mickyhill (`M-API-1`), Mikey (`M-API-7`) | Bolu (`M-UI-9`) |
| **M-UI-4** | Marketing task page | Fabian | Chizoba (`M-API-3`), Aaoron wisdom (`M-API-4`) | Bolu (`M-UI-9`) |
| **M-UI-5** | Library (Idea Box gallery) | Abdulmuiz, Adewumi Oluwasanmi | Aphoe (`M-API-5`) | Bolu (`M-UI-9`) |
| **M-UI-6** | Scoreboard page | Cynthia | Oluwalayomi Olayinka (`M-API-10`) | Bolu (`M-UI-9`) |
| **M-UI-7** | Marketing settings page | Kayinsola ogunwale, joshua emmanuel | emmyanzo (`M-API-6`), Mikey (`M-API-7`), Josemaria (`M-API-8`) | Bolu (`M-UI-9`) |
| **M-UI-8** | My work / escalations | Maryam, Emmanuel Orotayo | Habeebraji (`M-API-9`) | No UI task |
| **M-UI-9** | States & Accessibility | Bolu | All UI owners (`M-UI-1` through `M-UI-7`) | No UI task |
| **M-DOC-1** | Agent documentation | Abraham Bishop | All API owners (`M-API-1` through `M-API-11`) | Team & Agents |
| **M-DOC-2** | Contributor documentation | Adele | Nothing | Team Contributors |
| **M-E2E-1** | Playwright E2E Flow | Denise | All API and UI owners | Release Gate |

---

## Detailed Tasks & Acceptance Criteria

### API and Rules
**Paths:** `app/api/v1/**`, `lib/**`

#### M-API-1: Propose a Marketing Task
- **Owner:** Michael Mickyhill
- **Relies on:** Nothing
- **Waiting on you:** Hafeezah (`M-UI-3`), `M-DOC-1`, `M-E2E-1`
- **Acceptance Criteria:**
  1. `POST /api/v1/ideas` accepts `track: "marketing"`, `rationale: string`, `issueTypeId: string`, and `points: number` in the request body.
  2. Fails with `400 Bad Request` if `track === "marketing"` and `rationale` is missing, blank, or fewer than 10 characters.
  3. Validates that `points` is within the allowed bounds defined on the selected `IssueType` (`type.points <= points <= type.maxPoints`).
  4. Stores the idea in the database with `track = "marketing"`, linking `issueTypeId`, `rationale`, and `points`.
  5. Implements a type-safe Server Action export in `app/actions/marketing/propose.ts` with Zod validation for direct form consumption in `M-UI-3`.
  6. Exposes the capability as an MCP tool, catalog command in `cli/catalog.ts`, and verifies with an automated CLI test in `cli/tests/`.

---

#### M-API-2: Vote → Open / Reject
- **Owner:** Adele
- **Relies on:** Nothing
- **Waiting on you:** Peter Abah (`M-UI-2`), `M-DOC-1`, `M-E2E-1`
- **Acceptance Criteria:**
  1. Voting on a marketing idea records an `IdeaVerdict` (`good`, `bad`, or `neutral`) alongside the voter's reason.
  2. Prevents duplicate votes from the same agent or user.
  3. When positive votes cross the project threshold (`votesToDecide` / `ideaThreshold`, default 5), the idea automatically converts into an active issue (`Bug`) directly in status **`open` · `open`** (bypassing `requires_confirmation` entirely per Decision D2).
  4. When negative votes cross `votesToDecide`, sets the idea status to `rejected`.
  5. Awards vote points (default 5 points per D7) to the voting agent's owner as a `PointEntry` with `role = "idea"` and an idempotent `sourceKey = "idea-vote:${ideaId}:${userId}"`.

---

#### M-API-3: Marketing Delivery
- **Owner:** Chizoba
- **Relies on:** Nothing
- **Waiting on you:** Fabian (`M-UI-4`), `M-DOC-1`, `M-E2E-1`
- **Acceptance Criteria:**
  1. `POST /api/v1/issues/{id}/delivery` handles marketing issues without requiring Git parameters (`pullRequestUrl` or `headSha` are optional for marketing).
  2. Requires either `deliverableUrls: string[]` (e.g. Google Docs, Figma, published articles, Notion) or `screenshots: string[]` or non-empty `testResults` summary text.
  3. Rejects delivery if an agent submits a payload lacking all deliverable links and text (`400 Bad Request`).
  4. Transitions the issue to status `done` and substatus `requires_review` (`moveTo("requires_review")`), triggering review offer dispatches.
  5. Bypasses all GitHub pull request validation webhooks and PR status checks when `bug.track === "marketing"`.

---

#### M-API-4: Review and Revision Rounds
- **Owner:** Aaoron wisdom
- **Relies on:** Nothing
- **Waiting on you:** Fabian (`M-UI-4`), `M-DOC-1`, `M-E2E-1`
- **Acceptance Criteria:**
  1. Reviewers can submit test verdicts on marketing deliveries (`POST /api/v1/issues/{id}/test-results`) with `goodToMerge: true` (approve) or `goodToMerge: false` (request changes) without short-circuiting on `bug.pullRequestUrl`.
  2. Verdict counts resolve against `bugId` rather than `pullRequestUrl` when `bug.track === "marketing"`.
  3. When 2 independent approvals are recorded, advances substatus to `accepted`.
  4. When 2 "request changes" verdicts are recorded:
     - If `issue.revisionCount < maxRevisions` (default 2), increments `revisionCount` by 1 and moves issue back to `in_progress` under the **same claim holder**.
     - If `issue.revisionCount >= maxRevisions`, releases the claim, resets `revisionCount = 0`, and moves issue to `open` · `open` for open bidding.
  5. Awards review points (default 6 points) via `PointEntry` with `role = "reviewer"`, strictly enforcing the `paidReviewsPerTask` limit (default 4).

---

#### M-API-5: Accept → Live (Published)
- **Owner:** Aphoe
- **Relies on:** Nothing
- **Waiting on you:** Abdulmuiz, Adewumi Oluwasanmi (`M-UI-5`), `M-DOC-1`, `M-E2E-1`
- **Acceptance Criteria:**
  1. Manager review acceptance moves marketing issues from `accepted` straight to `resolved` with substatus `published` (or `on_dev`), completely skipping Merge and deployment report gates (Decision D1).
  2. Awards the worker their points (proposed points on task) as a `PointEntry` with `role: "solver"`.
  3. Automatically mints the creator share: awards 20% of worker points to the original task poster (`role: "reporter"`), rounded with `Math.floor`.
  4. Ensures payout idempotency via deterministic `sourceKey` values (`marketing-solve:${bugId}:${userId}` and `marketing-creator-share:${bugId}:${creatorUserId}`).
  5. Marks the delivery as published/live so it appears immediately in the Library gallery.

---

#### M-API-6: Marketing Settings API
- **Owner:** emmyanzo
- **Relies on:** Nothing
- **Waiting on you:** Kayinsola & Joshua (`M-UI-7`), `M-DOC-1`, `M-E2E-1`
- **Acceptance Criteria:**
  1. Provides `GET /api/v1/projects/{id}/marketing/settings` returning current project dials: `votePoints`, `votesToDecide`, `reviewPoints`, `paidReviewsPerTask`, `creatorSharePct`, `activeTaskLimit`, `maxRevisions`, and `weeklyTarget`.
  2. Provides `PATCH /api/v1/projects/{id}/marketing/settings` guarded strictly to tenant owners and admins (returns `403 Forbidden` for standard members/agents).
  3. Validates all numeric ranges using Zod (e.g. positive integers, `0 < creatorSharePct <= 100`, `maxRevisions >= 1`).
  4. Updates project settings in `ProjectWorkflow` (or dedicated `MarketingSettings` row) and returns the updated record.

---

#### M-API-7: Marketing Task Types API
- **Owner:** Mikey
- **Relies on:** Nothing
- **Waiting on you:** Hafeezah (`M-UI-3`), Kayinsola & Joshua (`M-UI-7`), `M-DOC-1`, `M-E2E-1`
- **Acceptance Criteria:**
  1. `GET /api/v1/projects/{id}/marketing/task-types` returns all active `IssueType` records filtered by `track: "marketing"`.
  2. `POST /api/v1/projects/{id}/marketing/task-types` creates a new marketing task category with `name`, `description`, `points` (default payout), and `maxPoints`.
  3. Validates that `points <= maxPoints` and enforces uniqueness on `(tenantId, name, track)`.
  4. `PATCH` and `DELETE` (soft-delete via `isActive: false`) endpoints for managing marketing categories, restricted to project/tenant admins.

---

#### M-API-8: Project Brief for Agents
- **Owner:** Josemaria
- **Relies on:** Nothing
- **Waiting on you:** Kayinsola & Joshua (`M-UI-7`), `M-DOC-1`, `M-E2E-1`
- **Acceptance Criteria:**
  1. Persists marketing brief fields on the `Project` model: `siteUrl`, `focus` (what matters right now), and `outOfScope` (what agents should not propose).
  2. `GET /api/v1/agents/me` returns the marketing brief object alongside project details whenever an agent queries its context.
  3. Updates `GET /<project>/work` to include brief highlights in the payload header so agents can evaluate proposals against current project focus.
  4. Provides a `PATCH /api/v1/projects/{id}/marketing/brief` endpoint for admins to update brief content, setting `briefUpdatedAt = now()`.

---

#### M-API-9: Work Feed and Events
- **Owner:** Habeebraji
- **Relies on:** Nothing
- **Waiting on you:** Maryam, Emmanuel Orotayo (`M-UI-8`), `M-DOC-1`, `M-E2E-1`
- **Acceptance Criteria:**
  1. Updates `GET /<project>/work` to accept a `?track=product|marketing|all` query parameter.
  2. Defaults `track` to `"product"` when the parameter is omitted (preventing autonomous coding agents from picking up marketing tasks).
  3. Returns marketing tasks with correct `minimumRole` and `canAct` flags for agents based on marketing state (bidding, delivering, reviewing).
  4. Includes `track` property on all SSE stream events (`eventStreamBus`) and webhooks so clients filter updates cleanly.

---

#### M-API-10: Scoreboard Data
- **Owner:** Oluwalayomi Olayinka
- **Relies on:** Nothing
- **Waiting on you:** Cynthia (`M-UI-6`), `M-DOC-1`, `M-E2E-1`
- **Acceptance Criteria:**
  1. Endpoint `GET /api/v1/projects/{id}/marketing/scoreboard` returns leaderboard metrics aggregated strictly from marketing `PointEntry` records (`track: "marketing"`).
  2. Supports period filtering: `?period=week|month|all_time`.
  3. Calculates progress towards the project's `weeklyTarget` (e.g. current week points sum vs. target).
  4. Includes the "Bidders" breakdown: lists agents who have placed active bids on open marketing tasks with their win/claim ratios.

---

#### M-API-11: Search
- **Owner:** Rabiah Usman
- **Relies on:** Nothing
- **Waiting on you:** No UI task
- **Acceptance Criteria:**
  1. Updates the global search endpoint `GET /api/v1/search` to accept a `track` filter (`product` vs `marketing`).
  2. In marketing mode, indexes and matches against `task.title`, `task.description`, `task.rationale`, deliverable URLs, and task type names.
  3. Ensures searching from `/[project]/marketing` returns marketing items first, without leaking internal product bugs unless explicitly requested.

---

### UI
**Paths:** `app/(app)/[project]/marketing/**`, `components/marketing/**`

#### M-UI-1: Tasks Board
- **Owner:** Abraham Bishop
- **Relies on:** Nothing (uses fixtures until API integration)
- **Waiting on you:** Bolu (`M-UI-9`), `M-E2E-1`
- **Acceptance Criteria:**
  1. Implements marketing tasks view at `app/(app)/[project]/marketing/tasks/page.tsx`.
  2. Displays 4 pipeline tabs matching Ziki status: **Open** (unclaimed/bidding), **In progress** (claimed), **Done** (in review), and **Live** (published deliverables).
  3. Provides filtering by Task Type and by Agent/Assignee.
  4. Responsive design: multi-column card layout on desktop, clean single-column accordion view on mobile devices.
  5. Shows points badge, revision counter (e.g. "Round 1/2"), and task type pill on each card.

---

#### M-UI-2: Proposals Page
- **Owner:** Peter Abah
- **Relies on:** Adele (`M-API-2`)
- **Waiting on you:** Bolu (`M-UI-9`), `M-E2E-1`
- **Acceptance Criteria:**
  1. Implements `app/(app)/[project]/marketing/proposals/page.tsx` displaying marketing ideas awaiting quorum votes.
  2. Displays proposal title, creator, rationale box ("How this serves focus"), proposed points, and task type.
  3. Provides interactive Upvote and Downvote buttons wired to Adele's vote endpoint with an inline reason input.
  4. Displays a real-time progress bar showing votes toward threshold (`votes / votesToDecide`).
  5. Includes a sub-tab or toggle for browsing "Rejected Proposals" with reasons cited.

---

#### M-UI-3: New Marketing Task Form
- **Owner:** Hafeezah
- **Relies on:** Michael Mickyhill (`M-API-1`), Mikey (`M-API-7`)
- **Waiting on you:** Bolu (`M-UI-9`), `M-E2E-1`
- **Acceptance Criteria:**
  1. Implements proposal form at `app/(app)/[project]/marketing/new/page.tsx` (or modal trigger on Proposals tab).
  2. Fields: Title, Description, Task Type dropdown (populated dynamically via `M-API-7`), Proposed Points slider/input, and Rationale textarea.
  3. The Rationale field has placeholder: *"Explain how this task directly serves the current campaign focus..."* and enforces client-side validation.
  4. The Points input dynamically enforces the min/max range of whichever Task Type is selected.
  5. Submits via Server Action from `M-API-1` with pending state, error banner, and redirect to the newly created proposal.

---

#### M-UI-4: Marketing Task Page
- **Owner:** Fabian
- **Relies on:** Chizoba (`M-API-3`), Aaoron wisdom (`M-API-4`)
- **Waiting on you:** Bolu (`M-UI-9`), `M-E2E-1`
- **Acceptance Criteria:**
  1. Implements the marketing issue detail page variant at `app/(app)/[project]/marketing/[number]/page.tsx`.
  2. Context header: displays task type, points badge, creator rationale, and current project focus banner.
  3. Bidding panel: displays bids, allows project admin to award offer, and displays offer countdown timer.
  4. Delivery panel: replaces git/PR UI with deliverable link list, file previews, and copy text viewer.
  5. Review & Revision panel: displays reviewer feedback, "approve" vs "changes requested" verdicts, and current round badge (`Revision X of 2`).
  6. Completely hides git branch, PR report, and deploy status components.

---

#### M-UI-5: Library (Approved Deliverables Gallery)
- **Owner:** Abdulmuiz, Adewumi Oluwasanmi
- **Relies on:** Aphoe (`M-API-5`)
- **Waiting on you:** Bolu (`M-UI-9`), `M-E2E-1`
- **Acceptance Criteria:**
  1. Implements `app/(app)/[project]/marketing/library/page.tsx` (replaces Amp's "Idea Box").
  2. Displays a responsive card/tile gallery of all published marketing deliverables (`status: "resolved"`).
  3. Cards show deliverable title, task type, completing agent/user, date published, and primary external link (Figma, doc, published post).
  4. Quick filters by task type (e.g. "All", "Articles", "Design Assets", "SEO Reports").
  5. Clicking a card opens a preview modal or drawer with full deliverable description and evidence attachments.

---

#### M-UI-6: Scoreboard Page
- **Owner:** Cynthia
- **Relies on:** Oluwalayomi Olayinka (`M-API-10`)
- **Waiting on you:** Bolu (`M-UI-9`), `M-E2E-1`
- **Acceptance Criteria:**
  1. Implements `app/(app)/[project]/marketing/scoreboard/page.tsx` adhering to Ziki Brand Guide (no Amp purple or unstyled tables).
  2. Header shows Weekly Target progress bar (e.g. `340 / 500 points this week`).
  3. Leaderboard table with rank, contributor/agent name, avatar, points earned, and tasks completed.
  4. Period selector tabs: This Week, This Month, All Time.
  5. "Bidders" tab showing active bidders and win rate statistics.

---

#### M-UI-7: Marketing Settings Page
- **Owner:** Kayinsola ogunwale, joshua emmanuel
- **Relies on:** emmyanzo (`M-API-6`), Mikey (`M-API-7`), Josemaria (`M-API-8`)
- **Waiting on you:** Bolu (`M-UI-9`), `M-E2E-1`
- **Acceptance Criteria:**
  1. Implements `app/(app)/[project]/marketing/settings/page.tsx` accessible only to project owners and admins.
  2. Tab 1 - Creative Brief Editor: editable fields for `siteUrl`, `focus`, and `outOfScope` with save button connected to `M-API-8`.
  3. Tab 2 - Task Types Manager: table of active marketing types, with modal to add/edit categories and point ranges connected to `M-API-7`.
  4. Tab 3 - Point Dials: form for tuning `votePoints`, `votesToDecide`, `reviewPoints`, `paidReviewsPerTask`, `creatorSharePct`, `activeTaskLimit`, and `weeklyTarget` connected to `M-API-6`.
  5. Displays authorization notice or redirects non-admin users.

---

#### M-UI-8: My Work & Escalations Integration
- **Owner:** Maryam, Emmanuel Orotayo
- **Relies on:** Habeebraji (`M-API-9`)
- **Waiting on you:** No UI task
- **Acceptance Criteria:**
  1. Updates the global `/work` feed and inbox views to include marketing tasks where the user/agent is bidder, claim holder, or reviewer.
  2. Adds a top-level segmented control or filter: `All` | `Product` | `Marketing`.
  3. Marketing cards display their distinctive marketing type badge and deliverable status.
  4. Urgent marketing escalations (e.g. offer expiring in < 2 hours, changes requested on revision 2) appear prominently in the Todo/Escalations tray.

---

#### M-UI-9: States, Resilience & Accessibility Audit
- **Owner:** Bolu
- **Relies on:** All UI owners (`M-UI-1` through `M-UI-7`)
- **Waiting on you:** `M-E2E-1`
- **Acceptance Criteria:**
  1. Implements polished Empty States for every marketing sub-tab (e.g. "No marketing proposals yet — be the first to propose one").
  2. Implements skeleton loading states (`loading.tsx`) for Tasks board, Proposals, Library, and Scoreboard.
  3. Implements local `error.tsx` boundary handling API errors gracefully with retry buttons.
  4. Runs full accessibility audit and passes `pnpm test tests/ui/critical-a11y` (semantic headings, ARIA tags on tabs and modals, keyboard navigation, color contrast compliant with Ziki themes).

---

### Docs, Tooling and Launch

#### M-DOC-1: Agent Documentation & LLM Prompts
- **Owner:** Abraham Bishop
- **Relies on:** All API owners (`M-API-1` to `M-API-11`)
- **Acceptance Criteria:**
  1. Updates `docs/ziki-for-agents.md` with complete documentation for marketing workflows: how agents propose ideas with rationale, how to query `/<project>/work?track=marketing`, how to submit file/URL deliveries, and how to cast review verdicts.
  2. Updates `llms.txt` and system prompts with the marketing schema contract.
  3. Ports essential agent strategies from Amp's `public/agent-guide.md` into the Ziki documentation format.

---

#### M-DOC-2: Contributor Documentation
- **Owner:** Adele
- **Relies on:** Nothing
- **Acceptance Criteria:**
  1. Adds a concise "Marketing Section" chapter to `README.md` and `docs/handbook.md`.
  2. Explains the differences between the Product track (code/PRs) and Marketing track (content/deliverables) for human contributors.
  3. Documents how project admins configure creative briefs and point dials.

---

#### M-E2E-1: Full Marketing E2E Playwright Flow
- **Owner:** Denise
- **Relies on:** All API and UI owners
- **Acceptance Criteria:**
  1. Implements an end-to-end test in `e2e/marketing-lifecycle.spec.ts`.
  2. Automated flow tests the complete lifecycle:
     - Admin creates project and sets marketing brief.
     - Agent A proposes a marketing idea with rationale.
     - Agents B & C vote $\rightarrow$ idea auto-converts to open task.
     - Agent D bids on the open task $\rightarrow$ Admin awards claim offer $\rightarrow$ Agent D accepts offer.
     - Agent D delivers marketing work with external link and text.
     - Reviewer agents submit approvals $\rightarrow$ Task advances to Accepted.
     - Manager accepts $\rightarrow$ Task transitions to Live (`published`).
     - Verifies points are awarded correctly in the database and visible on the Scoreboard.
  3. Passes reliably in headless CI runner.

---

## Where things are

| What | Where |
| :--- | :--- |
| **Code to branch from** | `main` on `zedu-vulcan/ziki` |
| **Decisions & Rules** | `docs/marketing-migration-plan.md` |
| **Agent API Contract** | `docs/ziki-for-agents.md` ("Marketing work" section) |
| **Rules Helper** | `lib/marketing/track.ts` |
| **Local Test Fixtures** | Run `pnpm db:fixtures`, sign in as `demo@fixtures.local` / `ziki-demo-password` |

## Ground Rules for Execution

1. **One branch and one PR to `main` per task ID.** Prefix branches with your task ID (e.g. `feat/m-api-1-propose-task`).
2. **Stay inside your designated paths** to avoid merge conflicts.
3. **Always run local tests** before opening your PR:
   ```bash
   pnpm verify:ready
   ```
4. If your route changes shape or you need a schema adjustment, update your downstream teammate immediately!
