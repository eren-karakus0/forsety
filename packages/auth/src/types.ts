export interface SiwaMessageParams {
  domain: string;
  address: string;
  nonce: string;
  chainId?: number;
  statement?: string;
  uri?: string;
  expirationMinutes?: number;
}

export interface SiwaVerifyParams {
  message: string;
  signature: string;
  /** If provided, verify the message domain matches this expected value. */
  expectedDomain?: string;
  /** If provided, verify the message URI matches this expected value. */
  expectedUri?: string;
}

export interface SiwaVerifyResult {
  success: boolean;
  address?: string;
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
