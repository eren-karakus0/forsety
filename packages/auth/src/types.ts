export interface AuthMessageParams {
  domain: string;
  address: string; // 0x + 64 hex (Aptos format)
  nonce: string;
  chainId?: number;
  statement?: string;
  uri?: string;
  expirationMinutes?: number;
}

export interface AuthVerifyParams {
  /** The full message that was signed (APTOS prefix included) */
  fullMessage: string;
  /** Ed25519 hex signature */
  signature: string;
  /** Ed25519 public key hex */
  publicKey: string;
  /** Expected signer address for validation */
  expectedAddress?: string;
  /** Expected domain for validation */
  expectedDomain?: string;
  /** Expected chain ID for validation (e.g., 110 for Shelbynet) */
  expectedChainId?: number;
}

export interface AuthVerifyResult {
  success: boolean;
  address?: string; // 0x + 64 hex (Aptos format)
  nonce?: string;
  error?: string;
}

export interface JwtPayload {
  sub: string; // wallet address
  iat: number;
  exp: number;
  nonce?: string;
}

export interface AuthSession {
  walletAddress: string;
  expiresAt: Date;
}
