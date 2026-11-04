import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { isMarketingSectionEnabled } from "@/lib/feature-flags";
import { AMP_URL } from "@/lib/header-nav";
import { marketingPath } from "@/lib/project-paths";
import { firstProjectSlugFor } from "@/lib/project-route";

export const metadata = { title: "Marketing" };

/** `/marketing` names no project: it opens the current project's section, or Amp until the section is on. */
export default async function MarketingPage() {
  if (!isMarketingSectionEnabled()) redirect(AMP_URL);
  const user = await requireUser();
  const slug = await firstProjectSlugFor(user.id);
  redirect(slug ? marketingPath(slug) : "/tenants");
}
