import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, unauthorizedResponse } from "@/lib/auth";
import { getForsetyClient } from "@/lib/forsety";
import { sanitizeAgent } from "@forsety/sdk";
import { apiError } from "@/lib/api-error";

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
    return apiError("Failed to register agent", error);
  }
}

export async function GET(request: NextRequest) {
  if (!validateApiKey(request)) return unauthorizedResponse();

  try {
    const client = getForsetyClient();
    const agents = await client.agents.list();
    return NextResponse.json({ agents: agents.map(sanitizeAgent) });
  } catch (error) {
    return apiError("Failed to list agents", error);
  }
}
