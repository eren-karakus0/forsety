"use client";

import { useState, useEffect } from "react";
import {
  useWallet,
  groupAndSortWallets,
  isInstallRequired,
  type AdapterWallet,
  type AdapterNotDetectedWallet,
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
import { toast } from "@forsety/ui";
import { useNetwork } from "@/lib/network-context";

interface WalletSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function isSocialLoginWallet(wallet: AdapterWallet | AdapterNotDetectedWallet): boolean {
  const name = wallet.name.toLowerCase();
  return name.includes("google") || name.includes("apple");
}

export function WalletSelector({ open, onOpenChange }: WalletSelectorProps) {
  const { wallets = [], notDetectedWallets = [], connect } = useWallet();
  const [connecting, setConnecting] = useState<string | null>(null);
  const { isAptosConnectSupported, networkDisplayName } = useNetwork();

  // Reset connecting state when dialog closes (handles stuck connections)
  useEffect(() => {
    if (!open) {
      setConnecting(null);
    }
  }, [open]);

  const {
    aptosConnectWallets,
    petraWebWallets,
    availableWallets,
    installableWallets,
  } = groupAndSortWallets([...wallets, ...notDetectedWallets]);

  const handleConnect = async (walletName: string) => {
    try {
      setConnecting(walletName);
      // Race: connect vs 30s timeout (some wallets never resolve/reject)
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Connection timeout")), 30_000)
      );
      await Promise.race([connect(walletName), timeout]);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof Error && err.message === "Connection timeout") {
        toast.error("Wallet connection timed out. Please try again.");
      }
    } finally {
      setConnecting(null);
    }
  };

  // Separate social login wallets from regular wallets
  const allConnectable = [
    ...availableWallets,
    ...aptosConnectWallets,
    ...petraWebWallets,
  ];

  const socialWallets = allConnectable.filter(isSocialLoginWallet);
  const regularWallets = allConnectable.filter((w) => !isSocialLoginWallet(w));

  // Wallets that need to be installed (not detected on device)
  const notInstalledWallets = installableWallets.filter((w) =>
    isInstallRequired(w)
  );

  const hasAnyWallet = allConnectable.length > 0 || notInstalledWallets.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-navy-200 bg-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-navy-800">
            <Wallet className="h-5 w-5 text-gold-500" />
            Connect Wallet
          </DialogTitle>
          <DialogDescription className="text-navy-500">
            Connect to Forsety on {networkDisplayName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 pt-2">
          {!hasAnyWallet && (
            <p className="py-4 text-center text-sm text-navy-500">
              No Aptos wallets detected. Install Petra or another Aptos wallet.
            </p>
          )}

          {/* Social login (Google/Apple) — visible on testnet, disabled until keyless verification is supported */}
          {isAptosConnectSupported && socialWallets.length > 0 && (
            <>
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-navy-100" />
                <span className="text-xs text-navy-400">Sign in with</span>
                <div className="h-px flex-1 bg-navy-100" />
              </div>

              {socialWallets.map((wallet) => (
                <button
                  key={wallet.name}
                  disabled
                  className="flex items-center gap-3 rounded-lg border border-navy-200 px-4 py-3 text-left opacity-50 cursor-not-allowed"
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
                  <span className="flex-1 text-sm font-medium text-navy-500">
                    {wallet.name}
                  </span>
                  <span className="text-xs text-navy-400">Coming Soon</span>
                </button>
              ))}
            </>
          )}

          {/* Regular wallets */}
          {regularWallets.length > 0 && (
            <>
              {isAptosConnectSupported && socialWallets.length > 0 && (
                <div className="flex items-center gap-2 pt-1">
                  <div className="h-px flex-1 bg-navy-100" />
                  <span className="text-xs text-navy-400">Or connect a wallet</span>
                  <div className="h-px flex-1 bg-navy-100" />
                </div>
              )}

              {regularWallets.map((wallet) => (
                <button
                  key={wallet.name}
                  onClick={() => handleConnect(wallet.name)}
                  disabled={connecting !== null}
                  data-umami-event="connect-wallet"
                  data-umami-event-wallet={wallet.name}
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
            </>
          )}

          {/* Not-installed wallets (show install links) */}
          {notInstalledWallets.length > 0 && allConnectable.length > 0 && (
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
