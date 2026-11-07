## 2026-11-06 — Saved Issue Views

- Objective and starting point: add private reusable issue-board views to main at a10eb30. Filters already live in project URLs, but there is no saved-view model.
- Checkpoint 1 — Investigation: traced project access, issue list filters, server actions, Prisma models and tests. Considered saved views, notes downloads, activity exports, webhook testing and deployment history. Selected saved views for recurring triage value and reuse of the board's existing URL format.
- Constraints: additive migration, per-user/project ownership, existing board permissions on every visit, no external dependency. Branch feat/saved-issue-views follows the user's approved naming pattern.
- Setup: pinned dependency install and Prisma generation completed. Node 22, available build space, local database and GitHub write access still need verification.
- Outcome: implementation in progress.

- Checkpoint 2 — Implementation: added private saved-view persistence, scoped server actions and a collapsible board control; documented usage in [saved-issue-views.md](saved-issue-views.md). Existing filter execution and permissions are reused. No new package dependencies.
- Checkpoint 3 — Initial verification: on Node 24, the full unit suite passed 964 tests and type checking passed; lint ran out of memory. Escaped JSX punctuation; the targeted recheck passed lint for that component, type checking and 42 affected tests. This was not a full lint pass.
- Checkpoint 4 — Upstream and environment: updated to upstream 7fb04b8; resolved only the version conflict with 0.1.44 and placed our migration after upstream's new one. Installed a temporary Node 22 runtime. All 184 migrations applied successfully to the isolated ziki_saved_views_test database, which was seeded for browser checks. A new full verification run is required because the runtime and Prisma client changed.
- Delivery preparation: fork created at sanmi21/ziki because upstream push permission is unavailable. Gradle cache retained at the user's request. Build, browser checks and PR submission remain pending.
- Checkpoint 5 — Node 22 verification: full lint passed (two warnings in unchanged files), type checking passed, and 967 of 969 unit tests passed. Two unchanged report-form tests timed out while importing modules; rerunning that failing file without changing tests or timeouts. All seven saved-view tests passed.
- Checkpoint 6 — Build and browser workflow on 7fb04b8: production build passed. The two report-form import timeouts passed on the 10-test focused recheck. Browser setup and both saved-view workflows passed (8 tests total) with local-only 90-second test / 30-second assertion limits after the initial 30/7-second run timed out. The committed config and assertions were unchanged. Removed 0.70 GiB of generated build cache.
- Checkpoint 7 — Compatibility update: upstream merged its organisation rename (22d65c8), touching the issue list and Prisma models. Reapplied our feature without source conflicts and raised the version to 0.1.45. Reverification on this new base is pending; the previous build and browser results describe the earlier base only.
- Checkpoint 8 — Updated base: applied all 185 migrations and confirmed the two test saved views survived the organisation rename. Lint and type checking passed on 22d65c8. The full unit run passed 958 of 963 tests, including all seven saved-view tests. Five report-form tests timed out under load and are being rechecked without changing their limits.
- Checkpoint 9 — Final local review: the five report-form timeouts on 22d65c8 passed on the 10-test recheck. Updated to 2c08549 for the new project-access rules and bumped the version to 0.1.58. Resolved the schema conflict by retaining upstream models and appending the saved-view model. Prisma generation and migrations passed against the isolated 189-migration test database. Node 22 lint passed for the changed TypeScript files and 52 focused tests passed across the saved-view and issue-list suites. The final full type check ran out of memory before returning diagnostics. The production build and desktop/mobile browser checks passed on the earlier 7fb04b8 base. The final revision still needs CI type checking, full tests, build and browser checks.
- Outcome: feature and documentation prepared for local review. Await the user’s go-ahead before submitting the PR to emerjent/ziki main from the fork.

## 2026-11-06 — Prepare issue #850 for PR

- Merged upstream main e71797d into the saved views branch. Resolved the only conflict in package.json by keeping upstream changes and raising the app version from 0.1.60 to 0.1.61.
- The feature commit 55cfa37 remains in the branch history. Verification of the combined revision is pending.
- The local full verification started on the combined revision. Its lint process exited with Windows status 3221226505 and no diagnostic. Final CI verification is required.
- GitHub PR #500 opened. After regenerating Prisma, the full type check found three upstream enum compatibility errors. The activity board now skips planning claims it cannot display or nudge, and the points ledger names the plan approval role. Targeted lint and 19 tests passed before these compatibility edits. Remote checks require maintainer approval.
- Regenerated Prisma against the merged schema. The full type check and lint on the compatibility files passed after the three enum fixes.

## 2026-11-07 — Unblock PR #500

- CI stopped at Version raised after main reached 0.1.61. Merged main at bf94f78, kept a single plan approval label to resolve the ledger conflict, and bumped to 0.1.62.
- Preserved upstream activity visibility rules and its planning nudge guard. Removed the obsolete zikiTasks guard from saved views after the type check detected the upstream route change.
- Version gate, full type check, focused lint and 21 affected tests passed locally. GitHub CI will rerun on the updated PR.

## 2026-11-07 — Refresh PR #500 after upstream version change

- Merged main at c0f848d and resolved the package.json conflict by preserving upstream settings and bumping 0.1.63 to 0.1.64.
- Version gate, Prisma generation, full type check, focused lint and 21 affected tests passed. GitHub checks will rerun on the existing PR.
