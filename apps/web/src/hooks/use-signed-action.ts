"use client";

import { useCallback } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import type { SignaturePayload } from "@/lib/types";
import { normalizeSignature, ensureCorrectNetwork } from "@/lib/wallet-utils";

/**
 * Hook that wraps any mutation with wallet signature approval.
 * Requests a mutation nonce, signs a message, and passes the signature to the server action.
 */
export function useSignedAction() {
  const { signMessage, account, changeNetwork, network } = useWallet();

  const executeWithSignature = useCallback(
    async <T>(
      actionDescription: string,
      serverAction: (sig: SignaturePayload) => Promise<T>
    ): Promise<T> => {
      if (!account?.address) {
        throw new Error("Wallet not connected");
      }

      const pubKeyStr = account.publicKey?.toString();
      if (!pubKeyStr || pubKeyStr.length < 10) {
        throw new Error("Wallet did not provide a public key");
      }

      // 1. Request mutation nonce from server
      const nonceRes = await fetch("/api/auth/mutation-nonce", {
        credentials: "include",
      });
      if (!nonceRes.ok) {
        const data = await nonceRes.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to get mutation nonce");
      }
      const { nonce } = await nonceRes.json();
      if (!nonce) throw new Error("Invalid nonce response");

      // 2. Ensure wallet is on correct network before signing
      await ensureCorrectNetwork(changeNetwork, network);

      // 3. Sign approval message with wallet
      const message = `Approve action: ${actionDescription}`;
      const signResult = await signMessage({
        message,
        nonce,
        address: true,
        application: true,
        chainId: true,
      });

      // 4. Normalize signature to hex string
      const signatureHex = normalizeSignature(signResult.signature);

      // 5. Call the server action with the signature payload
      return serverAction({
        fullMessage: signResult.fullMessage,
        signature: signatureHex,
        publicKey: pubKeyStr,
      });
    },
    [signMessage, account, changeNetwork, network]
  );

  return { executeWithSignature };
}
