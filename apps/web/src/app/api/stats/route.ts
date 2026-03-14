import { NextResponse } from "next/server";

export async function GET() {
  // Dormant: returns static placeholder data.
  // When the platform grows, replace with real aggregate counts:
  //   const client = getForsetyClient();
  //   const count = await client.datasets.count();
  return NextResponse.json({
    datasets: null,
    evidencePacks: null,
    agents: null,
    auditEvents: null,
    message: "Growing...",
  });
}
