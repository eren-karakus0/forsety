import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useDashboardData } from "@/hooks/use-dashboard-data";

// Mock useAuthGuard
const mockAuthGuard = { isAuthenticated: true, guard: vi.fn(() => true), isLoading: false, error: null, retrySignIn: vi.fn() };
vi.mock("@/hooks/use-auth-guard", () => ({
  useAuthGuard: () => mockAuthGuard,
}));

describe("useDashboardData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthGuard.isAuthenticated = true;
  });

  it("should return loading=true initially and then data", async () => {
    const fetcher = vi.fn().mockResolvedValue(["item1", "item2"]);

    const { result } = renderHook(() =>
      useDashboardData(fetcher, [] as string[])
    );

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(["item1", "item2"]);
    expect(result.current.error).toBe(false);
  });

  it("should set error=true when fetcher fails", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() =>
      useDashboardData(fetcher, [] as string[])
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(true);
    expect(result.current.data).toEqual([]);
  });

  it("should not fetch when not authenticated", async () => {
    mockAuthGuard.isAuthenticated = false;
    const fetcher = vi.fn().mockResolvedValue(["data"]);

    const { result } = renderHook(() =>
      useDashboardData(fetcher, [] as string[])
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetcher).not.toHaveBeenCalled();
    expect(result.current.data).toEqual([]);
  });

  it("should support reload", async () => {
    let callCount = 0;
    const fetcher = vi.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve([`data-${callCount}`]);
    });

    const { result } = renderHook(() =>
      useDashboardData(fetcher, [] as string[])
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(["data-1"]);

    act(() => {
      result.current.reload();
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(["data-2"]);
    });
  });

  it("should return fallback as initial data", () => {
    const { result } = renderHook(() =>
      useDashboardData(() => Promise.resolve(42), 0)
    );

    // Initially returns fallback
    expect(result.current.data).toBe(0);
  });
});
