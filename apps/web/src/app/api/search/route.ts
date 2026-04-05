import { NextRequest, NextResponse } from "next/server";
import { getForsetyClient } from "@/lib/forsety";
import { resolveAccessor, checkAgentScope, unauthorizedResponse } from "@/lib/auth";
import { apiError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  const auth = await resolveAccessor(request);
  if (!auth) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get("q");
  const type = searchParams.get("type") as "dataset" | "memory" | null;
  const limitStr = searchParams.get("limit");
  const agentId = searchParams.get("agentId");

  if (!rawQuery || rawQuery.trim().length < 1) {
    return NextResponse.json(
      { error: "Missing required query parameter: q" },
      { status: 400 }
    );
  }

  const query = rawQuery.trim().slice(0, 500);

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
      // Enforce agent permission scope for dataset search
      const scope = checkAgentScope(auth, "dataset.read");
      if (!scope.allowed) {
        return NextResponse.json({ error: scope.error }, { status: 403 });
      }

      const datasetIds = auth.agentAllowedDatasets && auth.agentAllowedDatasets.length > 0
        ? auth.agentAllowedDatasets
        : undefined;

      const rawResults = await client.datasets.searchByText(query, auth.accessor, limit, datasetIds);
      const results = rawResults.map((r) => ({
        id: r.id,
        name: r.name,
        type: "dataset",
      }));
      return NextResponse.json({ type, query, results, total: results.length });
    }

    if (!agentId) {
      return NextResponse.json(
        { error: "agentId is required for memory search" },
        { status: 400 }
      );
    }

    // Enforce agent permission scope for memory search
    const memScope = checkAgentScope(auth, "memory.read");
    if (!memScope.allowed) {
      return NextResponse.json({ error: memScope.error }, { status: 403 });
    }

    // Validate agent belongs to accessor
    const agent = await client.agents.getById(agentId);
    if (!agent || agent.ownerAddress !== auth.accessor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Memory search via recall vault text search
    const { items } = await client.recallVault.search(agentId, { keyPattern: query, limit });
    const results = items.map((m) => ({
      id: m.id,
      name: m.key,
      type: "memory",
    }));
    return NextResponse.json({ type, query, results, total: results.length });
  } catch (error) {
    return apiError("Search failed", error);
  }
}
