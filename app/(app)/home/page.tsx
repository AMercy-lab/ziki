import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { firstProjectRefFor } from "@/lib/project-route";
import { ideasPath } from "@/lib/project-paths";
import { currentTenantIdFor } from "@/lib/tenant-context";
import { earnWorkspace } from "@/lib/earn/earner";

/**
 * `/home`: where Ziki sends you when no project is named (after sign-in, from
 * a 404, from the logo with no project). It opens the Ideas of the first
 * project in the current workspace, or the workspace picker when there is none.
 */
export default async function HomePage() {
  const user = await requireUser();
  // In the Earn workspace, home is Earn's own default page, not the builders' Ideas.
  const [tenantId, earn] = await Promise.all([currentTenantIdFor(user.id), earnWorkspace().catch(() => null)]);
  if (earn && tenantId === earn.id) redirect("/earn/home");
  const slug = await firstProjectRefFor(user.id);
  redirect(slug ? ideasPath(slug) : "/tenants");
}
