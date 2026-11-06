import { prisma } from "@/lib/prisma";
import { recordOpen } from "@/lib/earn/outreach";

/**
 * A business's own link from an earner's email (#earn-outreach): ziki.dev/r/<code>. Opening it counts once
 * more for that business, so the earner sees who opened their email, then sends the visitor to Ziki's home
 * page. An unknown code goes there too. The redirect is a path, not an absolute URL: behind the proxy the
 * request's own address is the server's internal one.
 */
export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const safe = /^[a-z0-9]{4,16}$/.test(code) ? code : null;
  if (safe) await recordOpen(prisma, safe).catch((error) => console.error("[earn] link open failed", error));
  return new Response(null, { status: 307, headers: { Location: "/", "Cache-Control": "no-store" } });
}
