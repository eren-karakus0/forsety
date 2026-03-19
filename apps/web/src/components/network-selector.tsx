"use client";

import { Globe } from "lucide-react";
import { useNetwork } from "@/lib/network-context";

export function NetworkSelector() {
  const { networkDisplayName } = useNetwork();

  return (
    <div className="flex w-full items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
      <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]" />
      <span className="flex-1 text-xs font-medium text-muted-foreground">
        {networkDisplayName}
      </span>
    </div>
  );
}

export function NetworkSelectorCompact() {
  const { networkDisplayName } = useNetwork();

  return (
    <div className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground">
      <Globe className="h-3.5 w-3.5" />
      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]" />
      <span>{networkDisplayName}</span>
    </div>
  );
}
