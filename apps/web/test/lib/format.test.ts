import { describe, it, expect } from "vitest";
import {
  formatDate,
  formatDateShort,
  formatRelativeTime,
  formatBytes,
  formatDateTime,
  formatDateTimeLong,
  truncateAddress,
} from "@/lib/format";

describe("formatDate", () => {
  it("formats date string", () => {
    const result = formatDate("2024-06-15T12:00:00Z");
    expect(result).toContain("Jun");
    expect(result).toContain("15");
    expect(result).toContain("2024");
  });

  it("formats Date object", () => {
    const result = formatDate(new Date("2024-01-01"));
    expect(result).toContain("2024");
  });
});

describe("formatDateShort", () => {
  it("formats without year", () => {
    const result = formatDateShort("2024-06-15");
    expect(result).toContain("Jun");
    expect(result).toContain("15");
  });
});

describe("formatRelativeTime", () => {
  it('returns "just now" for recent', () => {
    expect(formatRelativeTime(new Date().toISOString())).toBe("just now");
  });

  it("returns minutes ago", () => {
    const tenMinAgo = new Date(Date.now() - 10 * 60000).toISOString();
    expect(formatRelativeTime(tenMinAgo)).toBe("10m ago");
  });

  it("returns hours ago", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3600000).toISOString();
    expect(formatRelativeTime(twoHoursAgo)).toBe("2h ago");
  });

  it("returns days ago", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
    expect(formatRelativeTime(threeDaysAgo)).toBe("3d ago");
  });
});

describe("formatBytes", () => {
  it("formats bytes", () => {
    expect(formatBytes(500)).toBe("500 B");
  });

  it("formats KB", () => {
    expect(formatBytes(2048)).toBe("2.0 KB");
  });

  it("formats MB", () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});

describe("formatDateTime", () => {
  it("formats date with time", () => {
    const result = formatDateTime("2024-06-15T14:30:00Z");
    expect(result).toContain("Jun");
    expect(result).toContain("15");
    expect(result).toContain("2024");
  });
});

describe("formatDateTimeLong", () => {
  it("includes seconds", () => {
    const result = formatDateTimeLong("2024-06-15T14:30:45Z");
    expect(result).toContain("Jun");
    expect(result).toContain("15");
  });
});

describe("truncateAddress", () => {
  it("truncates long address", () => {
    const addr = "0x1234567890abcdef1234567890abcdef";
    expect(truncateAddress(addr)).toBe("0x1234...cdef");
  });

  it("returns short address unchanged", () => {
    expect(truncateAddress("0x1234")).toBe("0x1234");
  });

  it("supports custom start/end lengths", () => {
    const addr = "0x1234567890abcdef1234567890abcdef";
    expect(truncateAddress(addr, 8, 6)).toBe("0x123456...abcdef");
  });
});
