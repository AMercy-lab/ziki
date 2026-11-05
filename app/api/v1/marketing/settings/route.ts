import { NextResponse, type NextRequest } from "next/server";
import { IssueApiError, agentIssueRequest, issueJson, issueProject } from "@/lib/agent-api/issues";
import { createMethodNotAllowed, createOptions } from "@/lib/agent-api/http-errors";
import { resolveSessionUserId } from "@/lib/session-user";
import { currentTenantIdFor, NO_TENANT_MESSAGE } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";
import {
  assertMarketingSettingsAccess,
  getMarketingSettings,
  updateMarketingSettings,
} from "@/lib/marketing/settings";

export const runtime = "nodejs";

function resolveProjectIdParam(request: NextRequest, body?: unknown): string {
  const query = request.nextUrl.searchParams.get("projectId") || request.nextUrl.searchParams.get("project");
  if (query?.trim()) return query.trim();
  if (body && typeof body === "object" && body !== null) {
    const b = body as Record<string, unknown>;
    if (typeof b.projectId === "string" && b.projectId.trim()) return b.projectId.trim();
    if (typeof b.project === "string" && b.project.trim()) return b.project.trim();
  }
  throw new IssueApiError(400, "projectId is required. Pass it as ?projectId= or in the JSON body.");
}

async function handleSessionGet(request: NextRequest) {
  const session = await resolveSessionUserId();
  if ("error" in session) {
    return NextResponse.json({ error: "unauthorized", message: "Authentication required." }, { status: 401 });
  }
  const tenantId = await currentTenantIdFor(session.userId);
  if (!tenantId) {
    return NextResponse.json({ error: "no_tenant", message: NO_TENANT_MESSAGE }, { status: 400 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true },
  });
  if (!user) {
    return NextResponse.json({ error: "unauthorized", message: "User not found." }, { status: 401 });
  }

  const projectId = resolveProjectIdParam(request);
  try {
    await assertMarketingSettingsAccess(user, tenantId, "view");
    const settings = await getMarketingSettings(tenantId, projectId);
    return NextResponse.json(settings);
  } catch (error) {
    if (error instanceof IssueApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}

async function handleSessionUpdate(request: NextRequest) {
  const session = await resolveSessionUserId();
  if ("error" in session) {
    return NextResponse.json({ error: "unauthorized", message: "Authentication required." }, { status: 401 });
  }
  const tenantId = await currentTenantIdFor(session.userId);
  if (!tenantId) {
    return NextResponse.json({ error: "no_tenant", message: NO_TENANT_MESSAGE }, { status: 400 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true },
  });
  if (!user) {
    return NextResponse.json({ error: "unauthorized", message: "User not found." }, { status: 401 });
  }

  const body = await issueJson(request);
  const projectId = resolveProjectIdParam(request, body);
  try {
    await assertMarketingSettingsAccess(user, tenantId, "change");
    const updated = await updateMarketingSettings(tenantId, projectId, user.id, body);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof IssueApiError) {
      return NextResponse.json(
        { error: error.message, ...(error.body ? { details: error.body } : {}) },
        { status: error.status },
      );
    }
    throw error;
  }
}

/**
 * GET /api/v1/marketing/settings?projectId=...
 */
export async function GET(request: NextRequest) {
  if (!request.headers.has("authorization")) {
    return handleSessionGet(request);
  }

  return agentIssueRequest(request, "marketing.settings.read", "working", null, async (agent) => {
    await assertMarketingSettingsAccess(
      { id: agent.ownerId, role: agent.ownerRole },
      agent.tenantId,
      "view",
    );
    const scope = await issueProject(agent, request.nextUrl.searchParams);
    const settings = await getMarketingSettings(agent.tenantId, scope.projectId);
    return NextResponse.json(settings);
  });
}

/**
 * PATCH /api/v1/marketing/settings
 */
export async function PATCH(request: NextRequest) {
  if (!request.headers.has("authorization")) {
    return handleSessionUpdate(request);
  }

  return agentIssueRequest(request, "marketing.settings.update", "working", null, async (agent) => {
    await assertMarketingSettingsAccess(
      { id: agent.ownerId, role: agent.ownerRole },
      agent.tenantId,
      "change",
    );
    const body = await issueJson(request);
    const scope = await issueProject(
      agent,
      request.nextUrl.searchParams,
      body && typeof body === "object" && "projectId" in body && typeof body.projectId === "string"
        ? body.projectId
        : undefined,
    );
    const updated = await updateMarketingSettings(agent.tenantId, scope.projectId, agent.ownerId, body);
    return NextResponse.json(updated);
  });
}

export async function PUT(request: NextRequest) {
  return PATCH(request);
}

export async function POST(request: NextRequest) {
  return PATCH(request);
}

const apiMethodNotAllowed = createMethodNotAllowed(["GET", "HEAD", "PATCH", "PUT", "POST", "OPTIONS"]);
export const DELETE = apiMethodNotAllowed;
export const OPTIONS = createOptions(["GET", "HEAD", "PATCH", "PUT", "POST", "OPTIONS"]);
