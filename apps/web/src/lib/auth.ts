import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "./env";

export function validateApiKey(request: NextRequest): boolean {
  const apiKey =
    request.headers.get("x-api-key") ??
    request.headers.get("authorization")?.replace("Bearer ", "");

  if (!apiKey) return false;

  return apiKey === getEnv().FORSETY_API_KEY;
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { error: "Unauthorized", message: "Invalid or missing API key" },
    { status: 401 }
  );
}
