# Idea Box (M-UI-5)

Open `/<project>/marketing/idea-box` directly. The Marketing landing page and shared navigation remain owned by M-LAUNCH-1. The existing app shell is reused; the reference design's sidebar is not duplicated. The Marketing breadcrumb and empty-state action use the existing landing page until the Tasks board ships. Task links use the shared `/<project>/<number>` issue route (D6).

The page checks `requireProject` before reading data. Reads are restricted to that tenant and project, non-deleted marketing tasks, `status: resolved`, and `substatus: published`. It uses the latest delivery and the accepting manager review's timestamp. Missing dates are left unknown. No lifecycle or payment writes happen here.

Deliverables currently come from `Delivery.deliverableUrls`. Only uploaded files explicitly named by their authenticated attachment route are resolved against that task's attachment metadata. Other task attachments, delivery screenshots and earlier deliveries are not promoted to approved work. M-API-3's planned `attachmentIds` association is not present in the foundation schema: integrate that explicit association when it ships rather than guessing which task files are deliverables. Aphoe's M-API-5 publication change can feed this page once merged; it need not be copied into this UI branch.

Selection, file, search, content filter, sort and mobile detail state are encoded in query parameters. Native browser history integrates with Next.js; desktop selection stays in the collection, while mobile selection opens `?view=detail` with a Back control. Refresh uses an access-checked server action and retains previous results when a refresh fails.

Images preserve aspect ratio. Videos use native playback controls. The current delivery contract provides no captions or poster URLs. PDF embedding depends on browser support and the source's framing policy; the original remains accessible. Articles and links display the source domain and the delivery summary, not scraped article content. Documents without supported previews have a file fallback. Remote downloads require the source to permit CORS; failures leave the original link available. No external page is fetched by the server to generate a preview.

Behavior cases were added to `tests/security/project-scope.test.ts`, `tests/ui/issue-detail.test.tsx`, and `tests/ui/critical-a11y.test.tsx`. Per AGENTS.md, run the readiness checks when the owner requests the PR, then report the exact coverage with `pnpm verify:status`.
