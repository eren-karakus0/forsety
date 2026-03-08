"use client";

import { useRouter } from "next/navigation";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useForsetyAuth } from "@/lib/auth-client";
import { Button } from "@forsety/ui";
import { LogOut, Wallet } from "lucide-react";

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletDisplay() {
  const router = useRouter();
  const { account, connected, disconnect } = useWallet();
  const { signOut } = useForsetyAuth();

  if (!connected || !account) {
    return (
      <div className="flex items-center gap-2 text-sm text-navy-500">
        <Wallet className="h-4 w-4" />
        <span>Not connected</span>
      </div>
    );
  }

  const address = account.address.toString();

  const handleSignOut = async () => {
    await signOut();
    await disconnect();
    router.push("/");
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 rounded-lg bg-navy-100 px-2.5 py-1.5">
        <Wallet className="h-3.5 w-3.5 text-navy-600" />
        <span className="font-mono text-xs font-medium text-navy-700">
          {truncateAddress(address)}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-navy-500 hover:text-red-600"
        onClick={handleSignOut}
        title="Sign out"
      >
        <LogOut className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
