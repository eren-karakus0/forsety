import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

const { apiError, validationError } = await import("@/lib/api-error");

describe("apiError", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns JSON error response with default 500 status", async () => {
    const res = apiError("Something broke", new Error("inner"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Something broke");
  });

  it("respects custom status code", async () => {
    const res = apiError("Not found", new Error("nope"), 404);
    expect(res.status).toBe(404);
  });

  it("includes details in development mode", async () => {
    const res = apiError("fail", new Error("detailed message"));
    const body = await res.json();
    // In test env (NODE_ENV=test), isProduction is false → details included
    expect(body.details).toBe("detailed message");
  });

  it("handles non-Error objects", async () => {
    const res = apiError("fail", "string-error");
    const body = await res.json();
    expect(body.details).toBe("string-error");
  });
});

describe("validationError", () => {
  it("returns 400 with field errors in development", async () => {
    const mockZodError = {
      flatten: () => ({
        fieldErrors: { name: ["required"] },
      }),
    };
    const res = validationError(mockZodError as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    // In test env → includes details
    expect(body.error).toBe("Validation failed");
    expect(body.details).toEqual({ name: ["required"] });
  });
});
