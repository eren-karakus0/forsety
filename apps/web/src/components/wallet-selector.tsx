"use client";

import { useState } from "react";
import {
  useWallet,
  groupAndSortWallets,
  isInstallRequired,
} from "@aptos-labs/wallet-adapter-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
} from "@forsety/ui";
import { Wallet, Download, Loader2 } from "lucide-react";

interface WalletSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WalletSelector({ open, onOpenChange }: WalletSelectorProps) {
  const { wallets = [], notDetectedWallets = [], connect } = useWallet();
  const [connecting, setConnecting] = useState<string | null>(null);

  const {
    aptosConnectWallets,
    petraWebWallets,
    availableWallets,
    installableWallets,
  } = groupAndSortWallets([...wallets, ...notDetectedWallets]);

  const handleConnect = async (walletName: string) => {
    try {
      setConnecting(walletName);
      await connect(walletName);
      onOpenChange(false);
    } catch {
      // User rejected or error
    } finally {
      setConnecting(null);
    }
  };

  // Combine all connectable wallets (installed + web-based)
  const connectableWallets = [
    ...availableWallets,
    ...aptosConnectWallets,
    ...petraWebWallets,
  ];

  // Wallets that need to be installed (not detected on device)
  const notInstalledWallets = installableWallets.filter((w) =>
    isInstallRequired(w)
  );

  const hasAnyWallet = connectableWallets.length > 0 || notInstalledWallets.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-navy-200 bg-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-navy-800">
            <Wallet className="h-5 w-5 text-gold-500" />
            Connect Wallet
          </DialogTitle>
          <DialogDescription className="text-navy-500">
            Connect your Aptos wallet to access Forsety on Shelbynet
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 pt-2">
          {!hasAnyWallet && (
            <p className="py-4 text-center text-sm text-navy-500">
              No Aptos wallets detected. Install Petra or another Aptos wallet.
            </p>
          )}

          {/* Connectable wallets (installed or web-based) */}
          {connectableWallets.map((wallet) => (
            <button
              key={wallet.name}
              onClick={() => handleConnect(wallet.name)}
              disabled={connecting !== null}
              className="flex items-center gap-3 rounded-lg border border-navy-200 px-4 py-3 text-left transition-colors hover:border-gold-400 hover:bg-navy-50 disabled:opacity-50"
            >
              {wallet.icon ? (
                /* eslint-disable-next-line @next/next/no-img-element -- wallet icons are data URIs from adapter */
                <img
                  src={wallet.icon}
                  alt={wallet.name}
                  className="h-8 w-8 rounded-lg"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-100">
                  <Wallet className="h-4 w-4 text-navy-600" />
                </div>
              )}
              <span className="flex-1 text-sm font-medium text-navy-800">
                {wallet.name}
              </span>
              {connecting === wallet.name ? (
                <Loader2 className="h-4 w-4 animate-spin text-gold-500" />
              ) : (
                <span className="text-xs text-navy-400">Connect</span>
              )}
            </button>
          ))}

          {/* Not-installed wallets (show install links) */}
          {notInstalledWallets.length > 0 && connectableWallets.length > 0 && (
            <div className="flex items-center gap-2 pt-2">
              <div className="h-px flex-1 bg-navy-100" />
              <span className="text-xs text-navy-400">More wallets</span>
              <div className="h-px flex-1 bg-navy-100" />
            </div>
          )}

          {notInstalledWallets.map((wallet) => (
            <a
              key={wallet.name}
              href={wallet.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border border-dashed border-navy-200 px-4 py-3 text-left transition-colors hover:border-navy-300 hover:bg-navy-50"
            >
              {wallet.icon ? (
                /* eslint-disable-next-line @next/next/no-img-element -- wallet icons are data URIs from adapter */
                <img
                  src={wallet.icon}
                  alt={wallet.name}
                  className="h-8 w-8 rounded-lg opacity-50"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-100">
                  <Wallet className="h-4 w-4 text-navy-400" />
                </div>
              )}
              <span className="flex-1 text-sm font-medium text-navy-500">
                {wallet.name}
              </span>
              <span className="flex items-center gap-1 text-xs text-navy-400">
                <Download className="h-3 w-3" />
                Install
              </span>
            </a>
          ))}
        </div>

        <div className="border-t border-navy-100 pt-3">
          <p className="text-center text-xs text-navy-400">
            Powered by Shelby Protocol on Aptos
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function WalletSelectorTrigger({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} className={className}>
        {children ?? (
          <>
            <Wallet className="mr-2 h-4 w-4" />
            Connect Wallet
          </>
        )}
      </Button>
      <WalletSelector open={open} onOpenChange={setOpen} />
    </>
  );
}
