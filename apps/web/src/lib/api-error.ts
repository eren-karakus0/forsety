import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import type { ZodError } from "zod";

const isProduction = process.env.NODE_ENV === "production";

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

  if (!isProduction) {
    body.details = error instanceof Error ? error.message : String(error);
  }

  return NextResponse.json(body, { status });
}

/**
 * Standardized validation error response.
 * - Production: returns generic "Invalid request parameters" (no field details leaked)
 * - Development: includes Zod field errors for debugging
 */
export function validationError(zodError: ZodError) {
  if (isProduction) {
    return NextResponse.json(
      { error: "Invalid request parameters" },
      { status: 400 }
    );
  }
  return NextResponse.json(
    { error: "Validation failed", details: zodError.flatten().fieldErrors },
    { status: 400 }
  );
}
