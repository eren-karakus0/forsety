import { AlertCircle } from "lucide-react";
import { Button } from "@forsety/ui";

interface ErrorBannerProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorBanner({
  message = "Something went wrong. Please try again.",
  onRetry,
}: ErrorBannerProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
      <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
      <p className="text-sm text-destructive">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="ml-auto shrink-0 text-destructive hover:text-destructive"
        >
          Retry
        </Button>
      )}
    </div>
  );
}
