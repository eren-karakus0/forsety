import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { resolveAccessor, resolveAccessorStrict, unauthorizedResponse } from "@/lib/auth";
import { getForsetyClient } from "@/lib/forsety";
import { apiError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  const auth = await resolveAccessor(request);
  if (!auth) return unauthorizedResponse();

  try {
    const client = getForsetyClient();
    const datasets = await client.datasets.listByOwner(auth.accessor);
    return NextResponse.json({ datasets });
  } catch (error) {
    return apiError("Failed to fetch datasets", error);
  }
}

export async function POST(request: NextRequest) {
  const auth = await resolveAccessorStrict(request);
  if (!auth) return unauthorizedResponse();

  let tempPath: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const name = formData.get("name") as string;
    const description = (formData.get("description") as string) || undefined;
    // ownerAddress comes from auth context, NOT from formData (prevents spoofing)
    const ownerAddress = auth.accessor;
    const spdxType = formData.get("spdxType") as string;
    const grantorAddress = (formData.get("grantorAddress") as string) || ownerAddress;

    if (!name || !spdxType) {
      return NextResponse.json(
        { error: "Missing required fields: name, spdxType" },
        { status: 400 }
      );
    }

    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 }
      );
    }

    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 50MB limit" },
        { status: 413 }
      );
    }

    const uploadDir = join(tmpdir(), "forsety-uploads");
    mkdirSync(uploadDir, { recursive: true });
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    tempPath = join(uploadDir, `${randomUUID()}-${safeName}`);
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
    return apiError("Failed to upload dataset", error);
  } finally {
    if (tempPath) {
      try { unlinkSync(tempPath); } catch { /* ignore */ }
    }
  }
}
