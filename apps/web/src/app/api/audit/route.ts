import { NextRequest, NextResponse } from "next/server";
import { validateAuth, unauthorizedResponse } from "@/lib/auth";
import { getForsetyClient } from "@/lib/forsety";

export async function GET(request: NextRequest) {
  if (!(await validateAuth(request))) return unauthorizedResponse();

  try {
    const url = new URL(request.url);
    const agentId = url.searchParams.get("agentId") ?? undefined;
    const status = url.searchParams.get("status") ?? undefined;
    const limit = parseInt(url.searchParams.get("limit") ?? "100", 10);
    const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);

    const client = getForsetyClient();
    const logs = await client.agentAudit.listAll({
      agentId: agentId === "anonymous" ? null : agentId,
      status,
      limit,
      offset,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to get audit logs", details: message },
      { status: 500 }
    );
  }
}
