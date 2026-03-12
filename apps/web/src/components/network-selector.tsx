"use client";

import { Check, ChevronDown, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@forsety/ui";
import { useNetwork } from "@/lib/network-context";
import type { SupportedNetwork } from "@/lib/aptos-config";

const NETWORKS: { id: SupportedNetwork; label: string; dotColor: string }[] = [
  { id: "shelbynet", label: "Shelbynet", dotColor: "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]" },
  { id: "testnet", label: "Aptos Testnet", dotColor: "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]" },
  { id: "mainnet", label: "Aptos Mainnet", dotColor: "bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.4)]" },
];

export function NetworkSelector() {
  const { activeNetwork, setNetwork } = useNetwork();
  const current = NETWORKS.find((n) => n.id === activeNetwork) ?? NETWORKS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-left transition-colors hover:bg-muted/80">
          <div className={`h-2 w-2 rounded-full ${current.dotColor}`} />
          <span className="flex-1 text-xs font-medium text-muted-foreground">
            {current.label}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        {NETWORKS.map((network) => (
          <DropdownMenuItem
            key={network.id}
            onClick={() => setNetwork(network.id)}
            className="flex items-center gap-2"
          >
            <div className={`h-2 w-2 rounded-full ${network.dotColor}`} />
            <span className="flex-1 text-sm">{network.label}</span>
            {activeNetwork === network.id && (
              <Check className="h-3.5 w-3.5 text-gold-500" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function NetworkSelectorCompact() {
  const { activeNetwork, setNetwork } = useNetwork();
  const current = NETWORKS.find((n) => n.id === activeNetwork) ?? NETWORKS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground">
          <Globe className="h-3.5 w-3.5" />
          <div className={`h-1.5 w-1.5 rounded-full ${current.dotColor}`} />
          <span>{current.label}</span>
          <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {NETWORKS.map((network) => (
          <DropdownMenuItem
            key={network.id}
            onClick={() => setNetwork(network.id)}
            className="flex items-center gap-2"
          >
            <div className={`h-2 w-2 rounded-full ${network.dotColor}`} />
            <span className="flex-1 text-sm">{network.label}</span>
            {activeNetwork === network.id && (
              <Check className="h-3.5 w-3.5 text-gold-500" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
