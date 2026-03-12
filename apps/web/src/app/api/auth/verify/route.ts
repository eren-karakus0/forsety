import { NextRequest, NextResponse } from "next/server";
import { eq, and, gt } from "drizzle-orm";
import { verifyAuthMessage, signJwt } from "@forsety/auth";
import { createDb, sessions, users } from "@forsety/db";
import { getEnv } from "@/lib/env";
import { CHAIN_ID_MAP, APTOS_NETWORK } from "@/lib/aptos-config";
import type { SupportedNetwork } from "@/lib/aptos-config";
import * as Sentry from "@sentry/nextjs";

const VALID_NETWORKS = ["shelbynet", "testnet", "mainnet"] as const;

export async function POST(request: NextRequest) {
  try {
    const { fullMessage, signature, publicKey, address, network } = await request.json();

    if (!fullMessage || !signature || !publicKey) {
      return NextResponse.json(
        { error: "Missing fullMessage, signature, or publicKey" },
        { status: 400 }
      );
    }

    // Determine which network/chain to validate against
    const requestedNetwork: SupportedNetwork = VALID_NETWORKS.includes(network)
      ? network
      : (APTOS_NETWORK as SupportedNetwork);
    const expectedChainId = CHAIN_ID_MAP[requestedNetwork];

    // Strict Ed25519 validation — reject non-Ed25519 (keyless) credentials
    // Keyless accounts cannot be verified locally; when Aptos provides a
    // local verification API for keyless proofs, this gate can be relaxed.
    const pubKeyHex = typeof publicKey === "string" ? publicKey.replace(/^0x/, "") : "";
    const sigHex = typeof signature === "string" ? signature.replace(/^0x/, "") : "";

    if (!/^[0-9a-fA-F]{64}$/.test(pubKeyHex)) {
      return NextResponse.json(
        { error: "Invalid public key format" },
        { status: 400 }
      );
    }

    if (!/^[0-9a-fA-F]{128}$/.test(sigHex)) {
      return NextResponse.json(
        { error: "Invalid signature format" },
        { status: 400 }
      );
    }

    // Verify Aptos signature with domain + chain ID binding
    const host = request.headers.get("host") ?? "localhost:3000";
    const strictChainId = process.env.AUTH_STRICT_CHAIN_ID !== "false";
    const result = verifyAuthMessage({
      fullMessage,
      signature,
      publicKey,
      expectedAddress: address,
      expectedDomain: host,
      expectedChainId,
      strictChainId,
    });

    if (!result.success || !result.address || !result.nonce) {
      console.error("[Auth Verify] Failed:", {
        error: result.error,
        host,
        address,
        network: requestedNetwork,
        hasFullMessage: !!fullMessage,
        hasSignature: !!signature,
      });
      Sentry.captureMessage("Auth verification failed", {
        level: "warning",
        extra: { error: result.error, host, address, network: requestedNetwork },
      });
      return NextResponse.json(
        { error: result.error ?? "Verification failed" },
        { status: 401 }
      );
    }

    const env = getEnv();
    const db = createDb(env.DATABASE_URL);
    const walletAddress = result.address.toLowerCase();

    // Atomic nonce consumption: delete + return in single query (prevents race condition)
    const [consumed] = await db
      .delete(sessions)
      .where(
        and(
          eq(sessions.nonce, result.nonce),
          eq(sessions.walletAddress, walletAddress),
          gt(sessions.expiresAt, new Date())
        )
      )
      .returning();

    if (!consumed) {
      return NextResponse.json(
        { error: "Invalid or expired nonce" },
        { status: 401 }
      );
    }

    // Upsert user record
    await db
      .insert(users)
      .values({ walletAddress, lastLoginAt: new Date() })
      .onConflictDoUpdate({
        target: users.walletAddress,
        set: { lastLoginAt: new Date() },
      });

    // Sign JWT
    const token = await signJwt(result.address, env.JWT_SECRET, {
      expiresIn: "1h",
      nonce: result.nonce,
    });

    // Set httpOnly cookie
    const response = NextResponse.json({
      success: true,
      address: result.address,
    });

    response.cookies.set("forsety-auth", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 3600,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[Auth Verify] Unexpected error:", error);
    Sentry.captureException(error, { extra: { route: "/api/auth/verify" } });
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}
