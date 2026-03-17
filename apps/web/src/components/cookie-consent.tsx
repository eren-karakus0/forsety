"use client";

import { useState, useEffect } from "react";
import Script from "next/script";
import { AnimatePresence, motion } from "framer-motion";

const STORAGE_KEY = "forsety-analytics-consent";

type Consent = "granted" | "denied" | null;

function getStoredConsent(): Consent {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "granted" || v === "denied") return v;
  } catch {
    // localStorage unavailable (Safari private mode, storage quota, etc.)
  }
  return null;
}

export function CookieConsent({ nonce }: { nonce?: string }) {
  const [consent, setConsent] = useState<Consent>(null);
  const [mounted, setMounted] = useState(false);

  const umamiUrl = process.env.NEXT_PUBLIC_UMAMI_URL;
  const umamiId = process.env.NEXT_PUBLIC_UMAMI_ID;
  const hasUmami = Boolean(umamiUrl && umamiId);

  useEffect(() => {
    setConsent(getStoredConsent());
    setMounted(true);
  }, []);

  function accept() {
    try { localStorage.setItem(STORAGE_KEY, "granted"); } catch { /* noop */ }
    setConsent("granted");
  }

  function decline() {
    try { localStorage.setItem(STORAGE_KEY, "denied"); } catch { /* noop */ }
    setConsent("denied");
  }

  // Don't render anything until client-side hydration
  if (!mounted) return null;

  // No Umami configured (dev environment) — skip entirely
  if (!hasUmami) return null;

  return (
    <>
      {/* Load Umami when consent is granted */}
      {consent === "granted" && (
        <Script
          src={umamiUrl}
          data-website-id={umamiId}
          strategy="afterInteractive"
          nonce={nonce}
        />
      )}

      {/* Consent bar — only when user hasn't decided yet */}
      <AnimatePresence>
        {consent === null && (
          <motion.div
            role="region"
            aria-label="Cookie consent preferences"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 border-t border-navy-800/20 bg-navy-950/95 p-4 backdrop-blur-md"
          >
            <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <p className="text-center text-sm text-gray-300 sm:text-left">
                We use cookieless, privacy-friendly analytics to understand how
                you use our service. No personally identifiable information is
                collected.
              </p>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  onClick={decline}
                  aria-label="Decline analytics tracking"
                  className="rounded text-sm text-gray-400 transition-colors hover:text-gray-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                >
                  Decline
                </button>
                <button
                  onClick={accept}
                  aria-label="Accept analytics tracking"
                  className="rounded-lg bg-gold-500 px-4 py-1.5 text-sm font-medium text-navy-950 transition-colors hover:bg-gold-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Accept
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
