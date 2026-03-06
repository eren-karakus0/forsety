"use server";

import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
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

  let tempPath: string | null = null;

  try {
    const contentType = request.headers.get("content-type") ?? "";

    let name: string;
    let description: string | undefined;
    let ownerAddress: string;
    let spdxType: string;
    let grantorAddress: string;
    let terms: Record<string, unknown> | undefined;

    if (contentType.includes("multipart/form-data")) {
      // Handle multipart upload
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      name = formData.get("name") as string;
      description = (formData.get("description") as string) || undefined;
      ownerAddress = formData.get("ownerAddress") as string;
      spdxType = formData.get("spdxType") as string;
      grantorAddress = (formData.get("grantorAddress") as string) || ownerAddress;

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
    } else {
      // Handle JSON body (legacy: server-local file path)
      const body = await request.json();
      name = body.name;
      description = body.description;
      ownerAddress = body.ownerAddress;
      spdxType = body.license?.spdxType;
      grantorAddress = body.license?.grantorAddress ?? ownerAddress;
      terms = body.license?.terms;
      tempPath = body.filePath;

      if (!name || !ownerAddress || !spdxType || !tempPath) {
        return NextResponse.json(
          { error: "Missing required fields: name, ownerAddress, license.spdxType, filePath" },
          { status: 400 }
        );
      }
    }

    const client = getForsetyClient();
    const result = await client.datasets.upload({
      filePath: tempPath!,
      name,
      description,
      ownerAddress,
      license: {
        spdxType,
        grantorAddress,
        terms,
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to upload dataset", details: String(error) },
      { status: 500 }
    );
  } finally {
    // Only cleanup multipart temp files (not JSON filePath which is user-controlled)
    if (tempPath && request.headers.get("content-type")?.includes("multipart")) {
      try { unlinkSync(tempPath); } catch { /* ignore */ }
    }
  }
}
