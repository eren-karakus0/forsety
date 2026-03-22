"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useForsetyAuth } from "@/lib/auth-client";
import { useNetwork } from "@/lib/network-context";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@forsety/ui";
import {
  LogOut,
  Wallet,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { WalletSelectorTrigger } from "@/components/wallet-selector";
import { truncateAddress } from "@/lib/format";

function getExplorerUrl(address: string): string {
  return `https://explorer.shelby.xyz/testnet/account/${address}`;
}

export function WalletDisplay() {
  const router = useRouter();
  const { account, connected, disconnect, wallet } = useWallet();
  const { signOut } = useForsetyAuth();
  const { networkDisplayName } = useNetwork();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: older browsers
    }
  }, []);

  if (!connected || !account) {
    return (
      <WalletSelectorTrigger className="h-8 gap-1.5 rounded-lg bg-gradient-to-r from-gold-500 to-gold-600 px-3 text-xs font-medium text-white hover:from-gold-400 hover:to-gold-500 border-0">
        <Wallet className="h-3.5 w-3.5" />
        Connect Wallet
      </WalletSelectorTrigger>
    );
  }

  const address = account.address.toString();
  const explorerUrl = getExplorerUrl(address);

  const handleSignOut = async () => {
    await signOut();
    await disconnect();
    router.push("/");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5 transition-colors hover:bg-muted/80" aria-label="Wallet options">
          {wallet?.icon ? (
            /* eslint-disable-next-line @next/next/no-img-element -- wallet icons are data URIs from adapter */
            <img src={wallet.icon} alt="" className="h-3.5 w-3.5 rounded-sm" />
          ) : (
            <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span className="font-mono text-xs font-medium text-foreground">
            {truncateAddress(address)}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="pb-0 text-xs font-normal text-muted-foreground">
          {networkDisplayName}
        </DropdownMenuLabel>

        {/* Full address with copy */}
        <div className="px-2 py-2">
          <div className="flex items-center gap-2 rounded-md bg-muted/50 px-2.5 py-2">
            <span className="flex-1 truncate font-mono text-xs text-foreground">
              {address}
            </span>
            <button
              onClick={() => handleCopy(address)}
              className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
              title="Copy address"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View in Explorer
          </a>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-red-600 focus:text-red-600"
        >
          <LogOut className="mr-2 h-3.5 w-3.5" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
