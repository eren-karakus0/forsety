import * as jose from "jose";
import type { JwtPayload } from "./types";

const ALGORITHM = "HS256";
const DEFAULT_EXPIRY = "1h";

function getSecret(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

/**
 * Sign a JWT token with wallet address as subject.
 */
export async function signJwt(
  walletAddress: string,
  secret: string,
  options?: { expiresIn?: string; nonce?: string; network?: string }
): Promise<string> {
  const payload: Record<string, unknown> = {};
  if (options?.nonce) {
    payload.nonce = options.nonce;
  }
  if (options?.network) {
    payload.network = options.network;
  }

  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(walletAddress)
    .setIssuedAt()
    .setExpirationTime(options?.expiresIn ?? DEFAULT_EXPIRY)
    .setIssuer("forsety")
    .setAudience("forsety-web")
    .sign(getSecret(secret));
}

/**
 * Verify and decode a JWT token.
 * Returns the payload if valid, null if invalid/expired.
 */
export async function verifyJwt(
  token: string,
  secret: string
): Promise<JwtPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, getSecret(secret), {
      issuer: "forsety",
      audience: "forsety-web",
    });
    return {
      sub: payload.sub ?? "",
      iat: payload.iat ?? 0,
      exp: payload.exp ?? 0,
      nonce: payload.nonce as string | undefined,
      network: payload.network as string | undefined,
    };
  } catch {
    return null;
  }
}
