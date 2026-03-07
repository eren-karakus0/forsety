import { NextRequest, NextResponse } from "next/server";
import { validateAuth, unauthorizedResponse } from "@/lib/auth";
import { getForsetyClient } from "@/lib/forsety";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await validateAuth(request))) return unauthorizedResponse();

  try {
    const { id } = await params;
    const client = getForsetyClient();
    const policy = await client.policies.getById(id);

    if (!policy) {
      return NextResponse.json(
        { error: "Policy not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(policy);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch policy", details: String(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await validateAuth(request))) return unauthorizedResponse();

  try {
    const { id } = await params;
    const body = await request.json();
    const client = getForsetyClient();

    // Get existing policy to derive dataset context
    const existing = await client.policies.getById(id);
    if (!existing) {
      return NextResponse.json(
        { error: "Policy not found" },
        { status: 404 }
      );
    }

    // Create a new policy version with updated fields
    const newPolicy = await client.policies.create({
      datasetId: existing.datasetId,
      allowedAccessors: body.allowedAccessors ?? existing.allowedAccessors,
      maxReads: body.maxReads ?? existing.maxReads ?? undefined,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : existing.expiresAt ?? undefined,
      createdBy: body.createdBy,
    });

    return NextResponse.json(newPolicy);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update policy", details: String(error) },
      { status: 500 }
    );
  }
}
