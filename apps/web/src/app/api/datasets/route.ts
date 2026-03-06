import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, unauthorizedResponse } from "@/lib/auth";
import { getForsetyClient } from "@/lib/forsety";

export async function GET(request: NextRequest) {
  if (!validateApiKey(request)) return unauthorizedResponse();

  try {
    const client = getForsetyClient();
    const datasets = await client.datasets.list();
    return NextResponse.json({ datasets });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch datasets", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { name, description, ownerAddress, license, filePath } = body;

    if (!name || !ownerAddress || !license?.spdxType || !filePath) {
      return NextResponse.json(
        { error: "Missing required fields: name, ownerAddress, license.spdxType, filePath" },
        { status: 400 }
      );
    }

    const client = getForsetyClient();
    const result = await client.datasets.upload({
      filePath,
      name,
      description,
      ownerAddress,
      license: {
        spdxType: license.spdxType,
        grantorAddress: license.grantorAddress ?? ownerAddress,
        terms: license.terms,
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to upload dataset", details: String(error) },
      { status: 500 }
    );
  }
}
