"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@forsety/ui";
import { useAuthGuard } from "@/hooks/use-auth-guard";

export function AuthErrorBanner() {
  const { error, retrySignIn, isLoading, isAuthenticated } = useAuthGuard();

  if (!error || isAuthenticated) return null;

  return (
    <div role="alert" className="mb-4 flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
      <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
      <div className="flex-1">
        <p className="text-sm font-medium text-destructive">Sign-in failed</p>
        <p className="text-xs text-destructive/80">{error}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={retrySignIn}
        disabled={isLoading}
        className="shrink-0 text-destructive hover:text-destructive"
      >
        <RefreshCw className={`mr-1.5 h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
        Retry
      </Button>
    </div>
  );
}
