import { NextResponse } from "next/server";
import { getAuthCookieOptions } from "@/lib/cookie-options";

export async function POST() {
  const response = NextResponse.json({ success: true });

  response.cookies.set("forsety-auth", "", getAuthCookieOptions(0));

  return response;
}
