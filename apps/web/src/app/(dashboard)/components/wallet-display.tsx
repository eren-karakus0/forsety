"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export function WalletDisplay() {
  return (
    <ConnectButton
      chainStatus="icon"
      accountStatus="address"
      showBalance={false}
    />
  );
}
