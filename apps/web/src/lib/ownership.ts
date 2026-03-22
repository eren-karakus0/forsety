import { NextResponse } from "next/server";

/**
 * DRY helper: verify dataset ownership. Returns error response if not owned.
 */
export async function assertOwnership(
  client: { datasets: { getById(id: string): Promise<{ ownerAddress: string } | null> } },
  datasetId: string,
  accessor: string
): Promise<
  | { dataset: { ownerAddress: string }; error?: never }
  | { error: NextResponse; dataset?: never }
> {
  const dataset = await client.datasets.getById(datasetId);
  if (!dataset) {
    return { error: NextResponse.json({ error: "Dataset not found" }, { status: 404 }) };
  }
  if (dataset.ownerAddress !== accessor) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { dataset };
}
