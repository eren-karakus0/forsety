import { NextRequest, NextResponse } from "next/server";
import { getForsetyClient } from "@/lib/forsety";
import { validateApiKey, unauthorizedResponse } from "@/lib/auth";
import { apiError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  if (!validateApiKey(request)) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const type = searchParams.get("type") as "dataset" | "memory" | null;
  const limitStr = searchParams.get("limit");
  const agentId = searchParams.get("agentId");

  if (!query) {
    return NextResponse.json(
      { error: "Missing required query parameter: q" },
      { status: 400 }
    );
  }

  if (!type || !["dataset", "memory"].includes(type)) {
    return NextResponse.json(
      { error: "Missing or invalid type parameter. Must be 'dataset' or 'memory'" },
      { status: 400 }
    );
  }

  const limit = limitStr ? Math.min(Math.max(parseInt(limitStr, 10) || 10, 1), 50) : 10;

  try {
    const client = getForsetyClient();

    if (type === "dataset") {
      const results = await client.vectorSearch.searchDatasets(query, limit);
      return NextResponse.json({ type, query, results, total: results.length });
    }

    if (!agentId) {
      return NextResponse.json(
        { error: "agentId is required for memory search" },
        { status: 400 }
      );
    }

    const results = await client.vectorSearch.searchMemories(agentId, query, limit);
    return NextResponse.json({ type, query, results, total: results.length });
  } catch (error) {
    return apiError("Search failed", error);
  }
}
