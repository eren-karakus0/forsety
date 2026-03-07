import { NextRequest, NextResponse } from "next/server";
import { validateAuth, unauthorizedResponse } from "@/lib/auth";
import { getForsetyClient } from "@/lib/forsety";

export async function GET(request: NextRequest) {
  if (!(await validateAuth(request))) return unauthorizedResponse();

  try {
    const datasetId = request.nextUrl.searchParams.get("datasetId");
    if (!datasetId) {
      return NextResponse.json(
        { error: "datasetId query parameter is required" },
        { status: 400 }
      );
    }

    const client = getForsetyClient();
    const policies = await client.policies.getByDatasetId(datasetId);
    return NextResponse.json({ policies });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch policies", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!(await validateAuth(request))) return unauthorizedResponse();

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
    const policy = await client.policies.create({
      datasetId,
      allowedAccessors,
      maxReads,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      createdBy,
    });

    return NextResponse.json(policy, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create policy", details: String(error) },
      { status: 500 }
    );
  }
}
