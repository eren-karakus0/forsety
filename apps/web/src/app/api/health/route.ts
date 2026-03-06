import { NextResponse } from "next/server";
import { getForsetyClient } from "@/lib/forsety";

export async function GET() {
  let shelbyStatus: { connected: boolean; cliVersion: string; context: string } = {
    connected: false,
    cliVersion: "unknown",
    context: "unknown",
  };

  try {
    const client = getForsetyClient();
    shelbyStatus = await client.getShelby().checkHealth();
  } catch {
    // Shelby check failed — report as disconnected
  }

  const overall = shelbyStatus.connected ? "ok" : "degraded";

  return NextResponse.json({
    status: overall,
    service: "forsety",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
    shelby: shelbyStatus,
  });
}
