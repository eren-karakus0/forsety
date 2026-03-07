import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, unauthorizedResponse } from "@/lib/auth";
import { getForsetyClient } from "@/lib/forsety";
import { sanitizeAgent } from "@forsety/sdk";

export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { name, description, ownerAddress, permissions, allowedDatasets, metadata } = body;

    if (!name || !ownerAddress) {
      return NextResponse.json(
        { error: "Missing required fields: name, ownerAddress" },
        { status: 400 }
      );
    }

    const client = getForsetyClient();
    const result = await client.agents.register({
      name,
      description,
      ownerAddress,
      permissions,
      allowedDatasets,
      metadata,
    });

    return NextResponse.json(
      {
        agent: sanitizeAgent(result.agent),
        apiKey: result.apiKey,
        warning: "Store this API key securely. It will not be shown again.",
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to register agent", details: message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  if (!validateApiKey(request)) return unauthorizedResponse();

  try {
    const client = getForsetyClient();
    const agents = await client.agents.list();
    return NextResponse.json({ agents: agents.map(sanitizeAgent) });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to list agents", details: message },
      { status: 500 }
    );
  }
}
