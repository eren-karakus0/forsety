"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, sepolia } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "Forsety",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "demo",
  chains: [mainnet, sepolia],
  ssr: true,
});
