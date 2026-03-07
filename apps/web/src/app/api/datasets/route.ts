import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { validateAuth, unauthorizedResponse } from "@/lib/auth";
import { getForsetyClient } from "@/lib/forsety";

export async function GET(request: NextRequest) {
  if (!(await validateAuth(request))) return unauthorizedResponse();

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
  if (!(await validateAuth(request))) return unauthorizedResponse();

  let tempPath: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const name = formData.get("name") as string;
    const description = (formData.get("description") as string) || undefined;
    const ownerAddress = formData.get("ownerAddress") as string;
    const spdxType = formData.get("spdxType") as string;
    const grantorAddress = (formData.get("grantorAddress") as string) || ownerAddress;

    if (!name || !ownerAddress || !spdxType) {
      return NextResponse.json(
        { error: "Missing required fields: name, ownerAddress, spdxType" },
        { status: 400 }
      );
    }

    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 }
      );
    }

    const uploadDir = join(tmpdir(), "forsety-uploads");
    mkdirSync(uploadDir, { recursive: true });
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    tempPath = join(uploadDir, `${Date.now()}-${safeName}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    writeFileSync(tempPath, buffer);

    const client = getForsetyClient();
    const result = await client.datasets.upload({
      filePath: tempPath,
      name,
      description,
      ownerAddress,
      license: {
        spdxType,
        grantorAddress,
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to upload dataset", details: String(error) },
      { status: 500 }
    );
  } finally {
    if (tempPath) {
      try { unlinkSync(tempPath); } catch { /* ignore */ }
    }
  }
}
