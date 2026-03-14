import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });

  const isProduction = process.env.NODE_ENV === "production";
  response.cookies.set("forsety-auth", "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "lax" : "strict",
    maxAge: 0,
    path: "/",
    ...(isProduction && { domain: ".forsety.xyz" }),
  });

  return response;
}
