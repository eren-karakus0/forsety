import { NextResponse } from "next/server";
import { getForsetyClient } from "@/lib/forsety";

export async function GET() {
  let shelbyStatus: { connected: boolean; cliVersion: string; context: string } = {
    connected: false,
    cliVersion: "unknown",
    context: "unknown",
  };

  let agentsCount = 0;

  try {
    const client = getForsetyClient();
    shelbyStatus = await client.getShelby().checkHealth();

    const agents = await client.agents.list();
    agentsCount = agents.length;
  } catch {
    // checks failed - report defaults
  }

  const overall = shelbyStatus.connected ? "ok" : "degraded";
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    return NextResponse.json({
      status: overall,
      timestamp: new Date().toISOString(),
    });
  }

  return NextResponse.json({
    status: overall,
    service: "forsety",
    version: "0.2.0",
    timestamp: new Date().toISOString(),
    shelby: shelbyStatus,
    recallVault: {
      registeredAgents: agentsCount,
    },
  });
}
