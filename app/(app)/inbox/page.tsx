import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { currentTenantIdFor, notificationInTenant } from "@/lib/tenant-context";
import { countPendingEscalations } from "@/lib/agent-questions";
import { countOpenRequestsForUser } from "@/lib/support-threads";
import { NotificationsView } from "./notifications-view";
import { EscalationsView } from "./escalations-view";
import { MessagesView } from "./messages-view";
import { RequestsView } from "./requests-view";

export const metadata = { title: "Inbox" };

type Params = { tab?: string; scope?: string | string[]; page?: string | string[]; status?: string; agent?: string; thread?: string };

/**
 * The Inbox (#inbox): your notifications, the escalations where agents stop
 * for you, and your messages with your agents (the one place you write to them). The envelope in the top bar opens it; its count is both.
 */
export default async function InboxPage({ searchParams }: { searchParams?: Promise<Params> }) {
  const user = await requireUser();
  const params = (await searchParams) ?? {};
  const tab =
    params.tab === "escalations"
      ? "escalations"
      : params.tab === "messages"
        ? "messages"
        : params.tab === "requests"
          ? "requests"
          : "notifications";
  const tenantId = await currentTenantIdFor(user.id);
  const [unread, waiting, openRequestsCount] = await Promise.all([
    prisma.notification.count({ where: { userId: user.id, readAt: null, ...notificationInTenant(tenantId, false) } }),
    tenantId ? countPendingEscalations(user.id, tenantId).catch(() => 0) : Promise.resolve(0),
    tenantId ? countOpenRequestsForUser(user.id, tenantId).catch(() => 0) : Promise.resolve(0),
  ]);
  const tabs = [
    { value: "notifications", label: "Notifications", href: "/inbox", count: unread },
    { value: "escalations", label: "Escalations", href: "/inbox?tab=escalations", count: waiting },
    { value: "messages", label: "Messages", href: "/inbox?tab=messages", count: 0 },
    { value: "requests", label: "Requests", href: "/inbox?tab=requests", count: openRequestsCount },
  ] as const;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 pb-10">
      <h1 className="text-[28px] font-extrabold leading-tight tracking-[-0.02em] text-zk-text">Inbox</h1>
      <nav aria-label="Inbox" className="flex gap-1 border-b border-zk-border">
        {tabs.map((item) => {
          const on = item.value === tab;
          return (
            <Link
              key={item.value}
              href={item.href}
              aria-current={on ? "page" : undefined}
              className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-semibold ${
                on ? "border-electric-blue-strong text-zk-text" : "border-transparent text-zk-muted hover:text-zk-text"
              }`}
            >
              {item.label}
              {item.count > 0 ? (
                <span className="rounded-full bg-electric-blue-strong px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-white">{item.count}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      {tab === "messages" ? (
        <MessagesView agent={params.agent} />
      ) : tab === "requests" ? (
        <RequestsView thread={params.thread} />
      ) : tab === "escalations" ? (
        <EscalationsView searchParams={Promise.resolve({ status: params.status })} />
      ) : (
        <NotificationsView searchParams={Promise.resolve({ scope: params.scope, page: params.page })} />
      )}
    </div>
  );
}
