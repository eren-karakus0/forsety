"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function VerifyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
      <h2 className="text-xl font-bold text-foreground">Verification Error</h2>
      <p className="text-sm text-muted-foreground">
        An error occurred while verifying the evidence pack. The link may be invalid.
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-gold-500 px-4 py-2 text-sm font-medium text-white hover:bg-gold-600 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
