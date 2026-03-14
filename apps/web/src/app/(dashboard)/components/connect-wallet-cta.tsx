"use client";

import type { LucideIcon } from "lucide-react";
import { Wallet } from "lucide-react";
import { Card, CardContent } from "@forsety/ui";
import { WalletSelectorTrigger } from "@/components/wallet-selector";

interface ConnectWalletCTAProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  variant?: "card" | "full-page";
}

export function ConnectWalletCTA({
  title = "Connect Your Wallet",
  description = "Connect your wallet to access your data and start using Forsety",
  icon: Icon = Wallet,
  variant = "card",
}: ConnectWalletCTAProps) {
  if (variant === "full-page") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-50 to-teal-50">
          <Icon className="h-7 w-7 text-gold-500" />
        </div>
        <h2 className="font-display text-xl font-bold text-foreground">
          {title}
        </h2>
        <p className="max-w-sm text-center text-sm text-muted-foreground">
          {description}
        </p>
        <WalletSelectorTrigger className="mt-2 bg-gradient-to-r from-gold-500 to-teal-500 text-white border-0 hover:from-gold-400 hover:to-teal-400" />
      </div>
    );
  }

  return (
    <Card className="rounded-xl border-dashed border-2 border-navy-200">
      <CardContent className="flex flex-col items-center gap-3 py-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-50 to-teal-50">
          <Icon className="h-6 w-6 text-gold-400" />
        </div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="max-w-xs text-center text-xs text-muted-foreground">
          {description}
        </p>
        <WalletSelectorTrigger className="mt-1 bg-gradient-to-r from-gold-500 to-teal-500 text-white border-0 hover:from-gold-400 hover:to-teal-400" />
      </CardContent>
    </Card>
  );
}
