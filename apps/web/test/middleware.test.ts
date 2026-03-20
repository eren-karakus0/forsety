import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { SignJWT } from "jose";

// ─── Mock rate-limit ────────────────────────────────────
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 }),
  getRateLimitTier: vi.fn().mockReturnValue("default"),
  RATE_LIMIT_TIERS: { default: { windowMs: 60000, max: 100 } },
}));

// ─── JWT Secret (alphanumeric, 34+ chars, no special chars) ──
const JWT_SECRET_STRING = "aGkQ2Lp9xRmZ7dFwN5vTsYeTestSecret";
const SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
process.env.JWT_SECRET = JWT_SECRET_STRING;

import { middleware } from "../src/middleware";

async function createToken(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(SECRET);
}

function makeDashboardRequest(host = "localhost:3000", token?: string) {
  const url = `http://${host}/dashboard`;
  const headers: Record<string, string> = { host };
  if (token) {
    headers["cookie"] = `forsety-auth=${token}`;
  }
  return new NextRequest(url, { method: "GET", headers });
}

let testnetToken: string;
let mainnetToken: string;
let noNetworkToken: string;

beforeAll(async () => {
  testnetToken = await createToken({ sub: "0xabc", network: "testnet" });
  mainnetToken = await createToken({ sub: "0xabc", network: "mainnet" });
  noNetworkToken = await createToken({ sub: "0xabc" });
});

describe("Middleware — network binding (localhost)", () => {
  beforeEach(() => {
    delete process.env.COOKIE_DOMAIN;
  });

  it("should pass through when no token is present", async () => {
    const req = makeDashboardRequest();
    const res = await middleware(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Security-Policy")).toBeTruthy();
  });

  it("should pass through when token has correct network (testnet)", async () => {
    const req = makeDashboardRequest("localhost:3000", testnetToken);
    const res = await middleware(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Security-Policy")).toBeTruthy();
    // No set-cookie (token is valid, no clearing)
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("should pass through when token has no network field (backward compat)", async () => {
    const req = makeDashboardRequest("localhost:3000", noNetworkToken);
    const res = await middleware(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("should redirect and clear cookie when token has wrong network", async () => {
    const req = makeDashboardRequest("localhost:3000", mainnetToken);
    const res = await middleware(req);

    // Should be a redirect (307)
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/");

    // Cookie must be cleared on the REDIRECT response itself (HIGH fix regression)
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain("forsety-auth=");
    expect(setCookie).toContain("Max-Age=0");
  });

  it("should clear cookie when token is invalid", async () => {
    const req = makeDashboardRequest("localhost:3000", "not-a-valid-jwt");
    const res = await middleware(req);

    // Should NOT redirect — continue as guest with cookie cleared
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain("forsety-auth=");
    expect(setCookie).toContain("Max-Age=0");
  });

  it("should include cookie domain from env on redirect", async () => {
    process.env.COOKIE_DOMAIN = ".forsety.xyz";
    const req = makeDashboardRequest("localhost:3000", mainnetToken);
    const res = await middleware(req);

    expect(res.status).toBe(307);
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("Domain=.forsety.xyz");
  });
});

describe("Middleware — network binding (app.forsety.xyz)", () => {
  beforeEach(() => {
    delete process.env.COOKIE_DOMAIN;
  });

  it("should redirect and clear cookie for wrong network on app domain", async () => {
    const req = makeDashboardRequest("app.forsety.xyz", mainnetToken);
    const res = await middleware(req);

    expect(res.status).toBe(307);
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain("forsety-auth=");
    expect(setCookie).toContain("Max-Age=0");
  });

  it("should pass through for correct network on app domain", async () => {
    const req = makeDashboardRequest("app.forsety.xyz", testnetToken);
    const res = await middleware(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toBeNull();
  });
});
