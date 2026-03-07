import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, unauthorizedResponse } from "@/lib/auth";
import { getForsetyClient } from "@/lib/forsety";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateApiKey(request)) return unauthorizedResponse();

  try {
    const { id } = await params;
    const client = getForsetyClient();
    const agent = await client.agents.getById(id);

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const auditSummary = await client.agentAudit.getSummary(id);

    return NextResponse.json({ agent, auditSummary });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to get agent", details: message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateApiKey(request)) return unauthorizedResponse();

  try {
    const { id } = await params;
    const body = await request.json();
    const client = getForsetyClient();

    const existing = await client.agents.getById(id);
    if (!existing) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (body.isActive === false) {
      await client.agents.deactivate(id);
      const updated = await client.agents.getById(id);
      return NextResponse.json({ agent: updated });
    }

    if (body.permissions || body.allowedDatasets) {
      const updated = await client.agents.updatePermissions(
        id,
        body.permissions ?? existing.permissions,
        body.allowedDatasets
      );
      return NextResponse.json({ agent: updated });
    }

    return NextResponse.json({ agent: existing });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to update agent", details: message },
      { status: 500 }
    );
  }
}
