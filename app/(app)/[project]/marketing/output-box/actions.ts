"use server";

import { requireProject } from "@/lib/project-route";
import { marketingPath } from "@/lib/project-paths";
import type { LibraryResult } from "@/components/marketing/library/model";
import { readLibrary } from "./data";

export async function refreshLibrary(slug: string): Promise<LibraryResult> {
  // Access failures must remain redirects/404s, never be disguised as an empty collection.
  const context = await requireProject(slug, marketingPath(slug, "output-box"));
  try {
    return { ok: true, items: await readLibrary(context) };
  } catch (error) {
    console.error("[library] Failed to read published marketing deliveries", error);
    return { ok: false };
  }
}
