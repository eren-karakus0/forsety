export function getAuthCookieOptions(maxAge: number) {
  const isProduction = process.env.NODE_ENV === "production";
  const domain = process.env.COOKIE_DOMAIN;
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict" as const,
    maxAge,
    path: "/",
    ...(domain ? { domain } : {}),
  };
}
