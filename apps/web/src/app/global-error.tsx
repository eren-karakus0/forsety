"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
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
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0e27",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "#e2e8f0",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 480, padding: "2rem" }}>
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: 700,
              marginBottom: "0.5rem",
              color: "#d4a937",
            }}
          >
            Something went wrong
          </h1>
          <p style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>
            An unexpected error occurred. Please try again.
          </p>
          {error.digest && (
            <p
              style={{
                fontSize: "0.75rem",
                color: "#64748b",
                marginBottom: "1.5rem",
                fontFamily: "monospace",
              }}
            >
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              padding: "0.75rem 2rem",
              background: "#d4a937",
              color: "#0a0e27",
              border: "none",
              borderRadius: "0.5rem",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "0.875rem",
              outline: "none",
            }}
            onFocus={(e) => { e.currentTarget.style.boxShadow = "0 0 0 3px rgba(212,169,55,0.5)"; }}
            onBlur={(e) => { e.currentTarget.style.boxShadow = "none"; }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
