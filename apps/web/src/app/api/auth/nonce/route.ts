import { NextRequest, NextResponse } from "next/server";
import { createSiwaMessage, generateNonce } from "@forsety/auth";

export async function GET(request: NextRequest) {
  const nonce = generateNonce();
  const host = request.headers.get("host") ?? "localhost:3000";
  const address = request.nextUrl.searchParams.get("address") ?? "0x0";

  const message = createSiwaMessage({
    domain: host,
    address,
    nonce,
    uri: `${request.nextUrl.protocol}//${host}`,
  });

  return NextResponse.json({ nonce, message });
}
