export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export const RATE_LIMIT_TIERS = {
  auth: { maxRequests: 5, windowMs: 60_000 },
  write: { maxRequests: 30, windowMs: 60_000 },
  read: { maxRequests: 60, windowMs: 60_000 },
  public: { maxRequests: 20, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitConfig>;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();
let lastCleanup = Date.now();

function getStore(storeKey: string): Map<string, RateLimitEntry> {
  let store = stores.get(storeKey);
  if (!store) {
    store = new Map();
    stores.set(storeKey, store);
  }
  return store;
}

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 5 * 60_000) return;
  lastCleanup = now;

  for (const store of stores.values()) {
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  storeKey: string,
  clientKey: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanup();

  const store = getStore(storeKey);
  const now = Date.now();
  const entry = store.get(clientKey);

  if (!entry || now > entry.resetAt) {
    const resetAt = now + config.windowMs;
    store.set(clientKey, { count: 1, resetAt });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt };
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

export function getRateLimitTier(pathname: string, method: string): keyof typeof RATE_LIMIT_TIERS {
  if (pathname.startsWith("/api/auth/")) return "auth";
  if (pathname.startsWith("/api/verify/")) return "public";
  if (pathname.startsWith("/api/stats")) return "public";
  if (method === "GET" || method === "HEAD") return "read";
  return "write";
}
