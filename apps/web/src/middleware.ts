import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "forsety-dev-secret-change-in-production-32ch"
);

export async function middleware(request: NextRequest) {
  // Only protect dashboard routes
  if (!request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  // Check for JWT cookie
  const token = request.cookies.get("forsety-auth")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  try {
    await jwtVerify(token, JWT_SECRET);
    return NextResponse.next();
  } catch {
    // Invalid or expired token — clear cookie and redirect
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.set("forsety-auth", "", { maxAge: 0, path: "/" });
    return response;
  }
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
