import { NextRequest, NextResponse } from "next/server";
import { resolveAccessor, resolveAccessorStrict, unauthorizedResponse } from "@/lib/auth";
import { getForsetyClient } from "@/lib/forsety";
import { apiError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  const auth = await resolveAccessor(request);
  if (!auth) return unauthorizedResponse();

  try {
    const datasetId = request.nextUrl.searchParams.get("datasetId");

    const client = getForsetyClient();

    // If datasetId is provided, verify ownership then return policies for that dataset
    if (datasetId) {
      const dataset = await client.datasets.getById(datasetId);
      if (!dataset || dataset.ownerAddress !== auth.accessor) {
        return NextResponse.json({ policies: [] });
      }
      const policies = await client.policies.getByDatasetId(datasetId);
      return NextResponse.json({ policies });
    }

    // No datasetId: return all policies for owner's datasets
    const policies = await client.policies.listByOwner(auth.accessor);
    return NextResponse.json({ policies });
  } catch (error) {
    return apiError("Failed to fetch policies", error);
  }
}

export async function POST(request: NextRequest) {
  const auth = await resolveAccessorStrict(request);
  if (!auth) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { datasetId, allowedAccessors, maxReads, expiresAt, createdBy } = body;

    if (!datasetId || !allowedAccessors?.length) {
      return NextResponse.json(
        { error: "Missing required fields: datasetId, allowedAccessors" },
        { status: 400 }
      );
    }

    const client = getForsetyClient();

    // Authorization: caller must be dataset owner
    const dataset = await client.datasets.getById(datasetId);
    if (!dataset) {
      return NextResponse.json(
        { error: "Dataset not found" },
        { status: 404 }
      );
    }
    if (dataset.ownerAddress !== auth.accessor) {
      return NextResponse.json(
        { error: "Forbidden: only the dataset owner can create policies" },
        { status: 403 }
      );
    }

    const policy = await client.policies.create({
      datasetId,
      allowedAccessors,
      maxReads,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      createdBy,
    });

    return NextResponse.json(policy, { status: 201 });
  } catch (error) {
    return apiError("Failed to create policy", error);
  }
}
