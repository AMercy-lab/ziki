# Server-backed workspace-switching sandbox

This deployment demonstrates the production PR's destination and membership resolver using **fictional demo memberships**, not production Ziki accounts or data. The sandbox is not production authentication. Its HTTP server checks access before changing an HttpOnly workspace cookie and redirects to the exact issue. It supports member, signed-out, unauthorized, missing and failed-switch scenarios, query/anchor preservation, refreshes and new tabs. It imports the production resolver and destination modules through the build script, and uses the production screen stylesheet.

Run `node demos/wrong-workspace/build.mjs`, then `node --test demos/wrong-workspace/handler.test.mjs`. `dist/` is generated and deployable to Vercel. The main app integration uses the existing Auth.js session, real membership/issue queries, protected workspace cookie helpers and server-action origin enforcement. No production DB was configured in this sandbox. The requested reference project is not owned by the available Vercel account, so the sandbox uses a separate authorized project.

Ziki submission: https://ziki.dev/ziki/ziki/ideas/457. This is an idea, not a converted issue or accepted claim. Do not deliver until conversion and workflow eligibility are confirmed. Never create a duplicate idea or invent an issue link.
