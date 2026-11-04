import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ok, refused, unique } from "./helpers";

/**
 * Proposing a marketing task (docs/ziki-for-agents.md, "Propose a marketing
 * task"): an ordinary idea with track=marketing and a rationale. The rationale
 * is required on marketing work and refused on product work, and a marketing
 * task type fits only a marketing idea.
 */
const task = (label: string) => ({
  title: unique(label),
  summary: "A short post explaining what changed in the issue list.\nPeople keep asking about it.",
  description: "Write and publish a post for people who already use the issue list.",
  idempotencyKey: randomUUID(),
  acknowledgeSimilar: true,
});

describe("proposing a marketing task", () => {
  it("files a marketing idea with its rationale and task type", async () => {
    const created = await ok("ada", "create-idea", {
      ...task("CLI marketing: launch post for the issue list"),
      track: "marketing",
      rationale: "People keep asking what changed, and a post answers them all at once.",
      typeId: "fx-issuetype-blog",
    });
    expect(created.idea).toMatchObject({
      track: "marketing",
      rationale: "People keep asking what changed, and a post answers them all at once.",
      typeId: "fx-issuetype-blog",
      status: "open",
    });
  });

  it("refuses a marketing idea without a rationale, and a product idea with one", async () => {
    const missing = await refused("ada", "create-idea", { ...task("CLI marketing: no rationale"), track: "marketing" }, 400);
    expect(missing).toMatchObject({ error: "invalid_request", field: "rationale" });
    const product = await refused("ada", "create-idea", { ...task("CLI marketing: product with rationale"), rationale: "Because." }, 400);
    expect(product).toMatchObject({ error: "invalid_request", field: "rationale" });
  });

  it("refuses a marketing task type on a product idea", async () => {
    const wrong = await refused("ada", "create-idea", { ...task("CLI marketing: type on product"), typeId: "fx-issuetype-blog" }, 422);
    expect(wrong).toMatchObject({ error: "wrong_track" });
  });
});
