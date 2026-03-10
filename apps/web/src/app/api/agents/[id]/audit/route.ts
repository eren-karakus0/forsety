import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, unauthorizedResponse } from "@/lib/auth";
import { getForsetyClient } from "@/lib/forsety";
import { apiError } from "@/lib/api-error";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateApiKey(request)) return unauthorizedResponse();

  try {
    const { id } = await params;
    const url = new URL(request.url);
    const action = url.searchParams.get("action") ?? undefined;
    const status = url.searchParams.get("status") ?? undefined;
    const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);
    const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);

    const client = getForsetyClient();
    const logs = await client.agentAudit.getByAgent(id, {
      action,
      status,
      limit,
      offset,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    return apiError("Failed to get audit logs", error);
  }
}
