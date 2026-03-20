"use server";

import { cookies } from "next/headers";
import { verifyJwt } from "@forsety/auth";
import { getEnv } from "@/lib/env";

interface SessionInfo {
  wallet: string;
  network: string;
}

export async function getWalletFromSession(): Promise<string | null>;
export async function getWalletFromSession(opts: { full: true }): Promise<SessionInfo | null>;
export async function getWalletFromSession(opts?: { full: true }): Promise<string | SessionInfo | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("forsety-auth")?.value;
  if (!token) return null;
  const payload = await verifyJwt(token, getEnv().JWT_SECRET);
  if (!payload?.sub) return null;
  // Reject tokens issued for a different network (defense-in-depth for API routes)
  if (payload.network && payload.network !== "testnet") return null;
  if (opts?.full) {
    return { wallet: payload.sub, network: payload.network ?? "testnet" };
  }
  return payload.sub;
}

export async function withAuth<T>(
  handler: (wallet: string) => Promise<T>,
  fallback?: T
): Promise<T> {
  const wallet = await getWalletFromSession();
  if (!wallet) {
    if (fallback !== undefined) return fallback;
    throw new Error("Not authenticated");
  }
  return handler(wallet);
}

export async function withAuthFull<T>(
  handler: (session: SessionInfo) => Promise<T>,
  fallback?: T
): Promise<T> {
  const session = await getWalletFromSession({ full: true });
  if (!session) {
    if (fallback !== undefined) return fallback;
    throw new Error("Not authenticated");
  }
  return handler(session);
}

export type { SessionInfo };
