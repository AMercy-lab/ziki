import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { joinEarnWorkspace } from "@/lib/earn/earner";

/**
 * Start earning (#earn-drafts): signed in, you join the Earn workspace and go
 * straight to connecting your agent. Nothing else is offered first.
 */
export default async function EarnStartPage() {
  const user = await requireUser();
  await joinEarnWorkspace(user.id);
  redirect("/settings/connect?from=earn");
}
