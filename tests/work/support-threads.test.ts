import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  bug: { findFirst: vi.fn() },
  agent: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), count: vi.fn() },
  supportThread: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  },
  threadMessage: { create: vi.fn() },
  agentInboxItem: { create: vi.fn(), createMany: vi.fn() },
  notification: { createMany: vi.fn() },
  $transaction: vi.fn(),
  $executeRaw: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: db }));

const expireUnreadCounts = vi.hoisted(() => vi.fn());
vi.mock("@/lib/cache-tags", () => ({ expireUnreadCounts }));

import {
  createSupportThread,
  addRequesterMessage,
  takeSupportThread,
  replySupportThread,
  releaseSupportThread,
  resolveSupportThread,
  closeSupportThreadsForIssue,
  supportThreadVisibilityWhere,
  countOpenRequestsForUser,
} from "@/lib/support-threads";

beforeEach(() => {
  vi.resetAllMocks();
  db.$transaction.mockImplementation(async (callback: (tx: typeof db) => Promise<unknown>) => callback(db));
  db.$executeRaw.mockResolvedValue(1);
});

describe("Support Threads Domain Logic", () => {
  const user = { id: "user-alice", name: "Alice" };
  const organisationId = "organisation-1";
  const issueId = "bug-1";

  describe("createSupportThread", () => {
    it("creates thread and fans out to eligible manager/merger agents excluding requester's own", async () => {
      db.bug.findFirst.mockResolvedValue({
        id: issueId,
        number: 42,
        title: "Stuck in progress fix",
        status: "in_progress",
        organisationId,
      });

      db.supportThread.findFirst.mockResolvedValue(null);
      db.supportThread.create.mockResolvedValue({ id: "thread-1" });
      db.agent.findMany.mockResolvedValue([
        { id: "agent-manager-1" },
        { id: "agent-merger-1" },
      ]);

      const res = await createSupportThread(user, organisationId, issueId, "Need help with the PR");

      expect(res).toEqual({ ok: true, threadId: "thread-1", existing: false });
      expect(db.$executeRaw).toHaveBeenCalled();
      expect(db.supportThread.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organisationId,
            bugId: issueId,
            requesterUserId: user.id,
            status: "open",
            messages: {
              create: {
                authorUserId: user.id,
                body: "Need help with the PR",
              },
            },
          }),
        }),
      );

      expect(db.agent.findMany).toHaveBeenCalledWith({
        where: {
          organisationId,
          revokedAt: null,
          level: { in: ["manager", "merger"] },
          ownerUserId: { not: user.id },
        },
        select: { id: true },
      });

      expect(db.agentInboxItem.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            agentId: "agent-manager-1",
            kind: "request",
            eventType: "request.created",
            bugId: issueId,
            payload: expect.objectContaining({
              threadId: "thread-1",
              bugId: issueId,
              issue: { number: 42, title: "Stuck in progress fix" },
              from: { type: "user", id: user.id, name: user.name },
              body: "Need help with the PR",
            }),
          }),
          expect.objectContaining({
            agentId: "agent-merger-1",
            kind: "request",
            eventType: "request.created",
            bugId: issueId,
          }),
        ],
      });
    });

    it("returns error if issue is not found or not in organisation", async () => {
      db.bug.findFirst.mockResolvedValue(null);
      const res = await createSupportThread(user, organisationId, "nonexistent", "Hello");
      expect(res).toEqual({ ok: false, error: "Issue not found." });
    });

    it("returns error if issue is in non-askable status", async () => {
      db.bug.findFirst.mockResolvedValue({
        id: issueId,
        number: 42,
        title: "Open issue",
        status: "open",
        organisationId,
      });

      const res = await createSupportThread(user, organisationId, issueId, "Hello");
      expect(res).toEqual({
        ok: false,
        error: "You can only ask about fixes that are in progress, done, or in merge.",
      });
    });

    it("returns existing active thread without duplicate creation", async () => {
      db.bug.findFirst.mockResolvedValue({
        id: issueId,
        number: 42,
        title: "Stuck fix",
        status: "in_progress",
        organisationId,
      });
      db.supportThread.findFirst.mockResolvedValue({ id: "existing-thread-1" });

      const res = await createSupportThread(user, organisationId, issueId, "Another question");
      expect(res).toEqual({ ok: true, threadId: "existing-thread-1", existing: true });
      expect(db.supportThread.create).not.toHaveBeenCalled();
      expect(db.agentInboxItem.createMany).not.toHaveBeenCalled();
    });
  });

  describe("addRequesterMessage", () => {
    it("allows requester to add message and notifies assignee when taken", async () => {
      db.supportThread.findFirst.mockResolvedValue({
        id: "thread-1",
        bugId: issueId,
        organisationId,
        requesterUserId: user.id,
        status: "taken",
        assigneeAgentId: "agent-1",
        bug: { number: 42, title: "Stuck fix" },
      });
      db.agent.findUnique.mockResolvedValue({ ownerUserId: "user-bob" });

      const res = await addRequesterMessage(user, organisationId, "thread-1", "Any update?");
      expect(res).toEqual({ ok: true });
      expect(db.threadMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            threadId: "thread-1",
            authorUserId: user.id,
            body: "Any update?",
          }),
        }),
      );
      expect(db.agentInboxItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            agentId: "agent-1",
            kind: "request",
            eventType: "request.message",
          }),
        }),
      );
      expect(db.notification.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            userId: "user-bob",
            kind: "support_thread",
            title: "New message on #42: Stuck fix",
          }),
        ],
      });
      expect(expireUnreadCounts).toHaveBeenCalledWith(["user-bob"]);
    });

    it("rejects non-requester messages", async () => {
      db.supportThread.findFirst.mockResolvedValue({
        id: "thread-1",
        organisationId,
        requesterUserId: "someone-else",
        status: "open",
        bug: { number: 42, title: "Stuck fix" },
      });

      const res = await addRequesterMessage(user, organisationId, "thread-1", "Hello");
      expect(res).toEqual({ ok: false, error: "Only the requester can add follow-up messages." });
    });

    it("rejects messages on resolved threads", async () => {
      db.supportThread.findFirst.mockResolvedValue({
        id: "thread-1",
        organisationId,
        requesterUserId: user.id,
        status: "resolved",
        bug: { number: 42, title: "Stuck fix" },
      });

      const res = await addRequesterMessage(user, organisationId, "thread-1", "Hello");
      expect(res).toEqual({ ok: false, error: "This request has already been resolved." });
    });
  });

  describe("takeSupportThread", () => {
    const bob = { id: "user-bob" };

    it("requires caller to own an eligible manager or merger agent", async () => {
      db.agent.findFirst.mockResolvedValue(null);
      const res = await takeSupportThread(bob, organisationId, "thread-1", "agent-invalid");
      expect(res).toEqual({ ok: false, error: "You must choose an active manager or merger agent you own." });
    });

    it("prevents requester from taking their own thread", async () => {
      db.agent.findFirst.mockResolvedValue({ id: "agent-mgr", name: "Agent Manager" });
      db.supportThread.findFirst.mockResolvedValue({
        id: "thread-1",
        organisationId,
        requesterUserId: bob.id,
        status: "open",
        bug: { number: 42, title: "Fix" },
      });

      const res = await takeSupportThread(bob, organisationId, "thread-1", "agent-mgr");
      expect(res).toEqual({ ok: false, error: "You cannot take your own request." });
    });

    it("handles race where another agent took it first (updateMany count === 0)", async () => {
      db.agent.findFirst.mockResolvedValue({ id: "agent-mgr", name: "Agent Manager" });
      db.supportThread.findFirst.mockResolvedValue({
        id: "thread-1",
        organisationId,
        requesterUserId: "user-alice",
        status: "open",
        bug: { number: 42, title: "Fix" },
      });
      db.supportThread.updateMany.mockResolvedValue({ count: 0 });

      const res = await takeSupportThread(bob, organisationId, "thread-1", "agent-mgr");
      expect(res).toEqual({ ok: false, error: "Someone already took this request." });
    });

    it("takes thread atomically and notifies requester on success", async () => {
      db.agent.findFirst.mockResolvedValue({ id: "agent-mgr", name: "Agent Manager" });
      db.supportThread.findFirst.mockResolvedValue({
        id: "thread-1",
        organisationId,
        bugId: issueId,
        requesterUserId: "user-alice",
        status: "open",
        bug: { number: 42, title: "Fix" },
      });
      db.supportThread.updateMany.mockResolvedValue({ count: 1 });

      const res = await takeSupportThread(bob, organisationId, "thread-1", "agent-mgr");
      expect(res).toEqual({ ok: true });
      expect(db.supportThread.updateMany).toHaveBeenCalledWith({
        where: { id: "thread-1", organisationId, status: "open" },
        data: expect.objectContaining({
          status: "taken",
          assigneeAgentId: "agent-mgr",
        }),
      });
      expect(db.notification.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            userId: "user-alice",
            kind: "support_thread",
            title: "Agent Manager took your request on #42",
          }),
        ],
      });
      expect(expireUnreadCounts).toHaveBeenCalledWith(["user-alice"]);
    });
  });

  describe("replySupportThread", () => {
    const bob = { id: "user-bob" };

    it("only allows the assignee agent's owner to reply", async () => {
      db.supportThread.findFirst.mockResolvedValue({
        id: "thread-1",
        organisationId,
        status: "taken",
        assigneeAgent: { id: "agent-mgr", name: "Agent Manager", ownerUserId: "user-other" },
        bug: { number: 42, title: "Fix" },
      });

      const res = await replySupportThread(bob, organisationId, "thread-1", "Here is the answer");
      expect(res).toEqual({ ok: false, error: "Only the owner of the assigned agent can reply." });
    });

    it("refuses replies when thread is not taken", async () => {
      db.supportThread.findFirst.mockResolvedValue({
        id: "thread-1",
        organisationId,
        status: "open",
        assigneeAgent: null,
        bug: { number: 42, title: "Fix" },
      });

      const res = await replySupportThread(bob, organisationId, "thread-1", "Here is the answer");
      expect(res).toEqual({ ok: false, error: "Can only reply to taken requests." });
    });

    it("records reply message as the assigned agent and notifies requester", async () => {
      db.supportThread.findFirst.mockResolvedValue({
        id: "thread-1",
        organisationId,
        bugId: issueId,
        requesterUserId: "user-alice",
        status: "taken",
        assigneeAgentId: "agent-mgr",
        assigneeAgent: { id: "agent-mgr", name: "Agent Manager", ownerUserId: bob.id },
        bug: { number: 42, title: "Fix" },
      });

      const res = await replySupportThread(bob, organisationId, "thread-1", "We restarted CI and checks are passing.");
      expect(res).toEqual({ ok: true });
      expect(db.threadMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            threadId: "thread-1",
            authorUserId: bob.id,
            authorAgentId: "agent-mgr",
            body: "We restarted CI and checks are passing.",
          }),
        }),
      );
      expect(db.notification.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            userId: "user-alice",
            kind: "support_thread",
            title: "Agent Manager replied to your request on #42",
          }),
        ],
      });
      expect(expireUnreadCounts).toHaveBeenCalledWith(["user-alice"]);
    });
  });

  describe("releaseSupportThread", () => {
    const bob = { id: "user-bob" };

    it("resets thread to open and fans out request.released to eligible agents", async () => {
      db.supportThread.findFirst.mockResolvedValue({
        id: "thread-1",
        organisationId,
        bugId: issueId,
        requesterUserId: "user-alice",
        status: "taken",
        assigneeAgent: { id: "agent-mgr", name: "Agent Manager", ownerUserId: bob.id },
        requester: { id: "user-alice", name: "Alice" },
        bug: { number: 42, title: "Fix" },
      });
      db.agent.findMany.mockResolvedValue([{ id: "agent-other-mgr" }]);

      const res = await releaseSupportThread(bob, organisationId, "thread-1");
      expect(res).toEqual({ ok: true });
      expect(db.supportThread.update).toHaveBeenCalledWith({
        where: { id: "thread-1" },
        data: expect.objectContaining({
          status: "open",
          assigneeAgentId: null,
        }),
      });
      expect(db.agentInboxItem.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            agentId: "agent-other-mgr",
            kind: "request",
            eventType: "request.released",
          }),
        ],
      });
    });
  });

  describe("resolveSupportThread", () => {
    it("allows requester to resolve manually and notifies assignee owner", async () => {
      db.supportThread.findFirst.mockResolvedValue({
        id: "thread-1",
        organisationId,
        bugId: issueId,
        requesterUserId: user.id,
        status: "taken",
        assigneeAgent: { id: "agent-mgr", ownerUserId: "user-bob" },
        bug: { number: 42, title: "Fix" },
      });

      const res = await resolveSupportThread(user, organisationId, "thread-1");
      expect(res).toEqual({ ok: true });
      expect(db.supportThread.update).toHaveBeenCalledWith({
        where: { id: "thread-1" },
        data: expect.objectContaining({
          status: "resolved",
          resolvedReason: "manual",
        }),
      });
      expect(db.notification.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            userId: "user-bob",
            title: "Request on #42 marked resolved",
          }),
        ],
      });
    });

    it("refuses resolution by unrelated user", async () => {
      db.supportThread.findFirst.mockResolvedValue({
        id: "thread-1",
        organisationId,
        requesterUserId: "user-alice",
        status: "taken",
        assigneeAgent: { id: "agent-mgr", ownerUserId: "user-bob" },
        bug: { number: 42, title: "Fix" },
      });

      const res = await resolveSupportThread({ id: "user-stranger" }, organisationId, "thread-1");
      expect(res).toEqual({
        ok: false,
        error: "Only the requester or the assigned agent's owner can resolve this request.",
      });
    });
  });

  describe("visibility and count", () => {
    it("restricts visibility to own requests if user owns no eligible agent", async () => {
      db.agent.count.mockResolvedValue(0);
      const where = await supportThreadVisibilityWhere("user-plain", organisationId);
      expect(where).toEqual({
        organisationId,
        requesterUserId: "user-plain",
      });
    });

    it("broadens visibility to open threads and assigned threads if user owns eligible agent", async () => {
      db.agent.count.mockResolvedValue(1);
      const where = await supportThreadVisibilityWhere("user-mgr", organisationId);
      expect(where).toEqual({
        organisationId,
        OR: [
          { requesterUserId: "user-mgr" },
          { status: "open" },
          { assigneeAgent: { ownerUserId: "user-mgr" } },
        ],
      });
    });

    it("returns 0 open count if user owns no eligible agents", async () => {
      db.agent.count.mockResolvedValue(0);
      const count = await countOpenRequestsForUser("user-plain", organisationId);
      expect(count).toBe(0);
      expect(db.supportThread.count).not.toHaveBeenCalled();
    });

    it("returns open requests count excluding own requests if user owns eligible agents", async () => {
      db.agent.count.mockResolvedValue(2);
      db.supportThread.count.mockResolvedValue(3);

      const count = await countOpenRequestsForUser("user-mgr", organisationId);
      expect(count).toBe(3);
      expect(db.supportThread.count).toHaveBeenCalledWith({
        where: {
          organisationId,
          status: "open",
          requesterUserId: { not: "user-mgr" },
        },
      });
    });
  });

  describe("closeSupportThreadsForIssue", () => {
    it("is a no-op when no active threads exist", async () => {
      const tx = {
        supportThread: { findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn() },
        notification: { createMany: vi.fn() },
      };

      await closeSupportThreadsForIssue(tx as never, { bugId: "bug-none", reason: "fix_live" });
      expect(tx.supportThread.updateMany).not.toHaveBeenCalled();
      expect(tx.notification.createMany).not.toHaveBeenCalled();
    });

    it("resolves active threads and creates notifications for requesters and assignees", async () => {
      const tx = {
        supportThread: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "t-1",
              organisationId: "t1",
              requesterUserId: "user-req",
              assigneeAgent: { ownerUserId: "user-agent-owner" },
              bug: { number: 10, title: "Resolved bug" },
            },
          ]),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        notification: { createMany: vi.fn().mockResolvedValue({ count: 2 }) },
      };

      await closeSupportThreadsForIssue(tx as never, { bugId: "bug-10", reason: "fix_live" });

      expect(tx.supportThread.updateMany).toHaveBeenCalledWith({
        where: { bugId: "bug-10", status: { in: ["open", "taken"] } },
        data: expect.objectContaining({
          status: "resolved",
          resolvedReason: "fix_live",
        }),
      });

      expect(tx.notification.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            userId: "user-req",
            title: "Request on #10 resolved (fix is now live)",
          }),
          expect.objectContaining({
            userId: "user-agent-owner",
            title: "Request on #10 resolved (fix is now live)",
          }),
        ]),
      });
      expect(expireUnreadCounts).toHaveBeenCalledWith(["user-req", "user-agent-owner"]);
    });
  });
});

