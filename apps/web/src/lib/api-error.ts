import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

/**
 * Standardized API error response.
 * - Production: returns only { error: message } (no internals leaked)
 * - Development: includes { error, details } for debugging
 */
export function apiError(
  message: string,
  error: unknown,
  status: number = 500
) {
  console.error(`[API] ${message}:`, error);
  Sentry.captureException(error, { extra: { message, status } });

  const body: Record<string, string> = { error: message };

  if (process.env.NODE_ENV === "development") {
    body.details = error instanceof Error ? error.message : String(error);
  }

  return NextResponse.json(body, { status });
}
