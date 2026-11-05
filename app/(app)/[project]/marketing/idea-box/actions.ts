"use server";

import { requireProject } from "@/lib/project-route";
import { marketingPath } from "@/lib/project-paths";
import type { IdeaBoxResult } from "@/components/marketing/idea-box/model";
import { readIdeaBox } from "./data";

export async function refreshIdeaBox(slug: string): Promise<IdeaBoxResult> {
  // Access failures must remain redirects/404s, never be disguised as an empty collection.
  const context = await requireProject(slug, marketingPath(slug, "idea-box"));
  try {
    return { ok: true, items: await readIdeaBox(context) };
  } catch (error) {
    console.error("[idea-box] Failed to read published marketing deliveries", error);
    return { ok: false };
  }
}
