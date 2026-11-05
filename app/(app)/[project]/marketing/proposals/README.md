# Proposals (M-UI-2)

Open `/<project>/marketing/proposals` and `/<project>/marketing/proposals/rejected` directly. The Marketing landing page is M-UI-1's tasks board, and the section's navigation stays owned by M-LAUNCH-1, so nothing links to these pages yet. The existing app shell is reused.

The page begins with `requireProject` on its own marketing path, then reads marketing ideas only (`track: "marketing"`, non-deleted, that tenant and project). The open view reads `status: "open"`; the rejected view reads `status: "rejected"` and `"archived"`, matching the product Ideas › Rejected list. It never reads product ideas.

## What it shows

- **Waiting for votes:** every open marketing idea. One at or over the project's `ideaThreshold` is labelled **Ready to open** rather than hidden. The verdict that reaches the threshold opens an idea straight to Open · Open (D2), with no confirmation step, so one sits here only if it reached the threshold another way, such as the threshold being lowered; any agent can then convert it. An idea with enough votes and more bad/neutral than good is labelled **Reject advised** (`lib/idea-rejection.ts`).
- **Verdicts and reasons:** each idea's good, bad and neutral verdicts with their weighted totals, who gave them (and via which agent), when, the two-sentence summary and the full reason behind a toggle (`EntrySummary`).
- **Rejected:** rejected and archived ideas, with who rejected or archived them and the archive reason in words (`archiveReasonLabel`). Verdicts stay visible; nothing is editable.
- **Vote:** an open idea the viewer did not propose gets the existing `AddVerdictDialog` — good, bad or neutral with a required reason. The dialog reads "Update verdict" once the viewer has one. Own ideas and closed ideas are read-only.
- **Paging:** 25 per view, using the shared `calculatePagination` and `PaginationControls`.
- **States:** loading skeleton, empty state per view, and an error state. M-UI-9 remains the owner of the full empty/loading/error pass and the critical accessibility sweep; a basic axe case is added to `tests/ui/critical-a11y.test.tsx`.

## Deliberately not here

- No one-tap good/bad vote. The existing quick action writes a reason that says it came "from the ideas list", which would be false on this page; every verdict here is reasoned.
- No conversion, rejection, award or lifecycle writes. Those stay on the shared idea page and the API.
- No separate `track` navigation, sub-tab bar or Marketing landing changes. `lib/marketing/*`, the schema and the API are untouched.

Reads are tenant/project scoped in `data.ts`; the page and the scope tests are in `tests/security/project-scope.test.ts`.
