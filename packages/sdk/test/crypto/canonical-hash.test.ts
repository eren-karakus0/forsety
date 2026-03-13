import { describe, it, expect } from "vitest";
import { canonicalHash } from "../../src/crypto/canonical-hash";

describe("canonicalHash", () => {
  it("should produce the same hash regardless of key order", () => {
    const hash1 = canonicalHash({ a: 1, b: 2, c: 3 });
    const hash2 = canonicalHash({ c: 3, a: 1, b: 2 });
    expect(hash1).toBe(hash2);
  });

  it("should produce consistent hashes for the same data", () => {
    const data = { spdxType: "MIT", grantorAddress: "0x123", terms: {} };
    const hash1 = canonicalHash(data);
    const hash2 = canonicalHash(data);
    expect(hash1).toBe(hash2);
  });

  it("should produce a valid hex hash for empty objects", () => {
    const hash = canonicalHash({});
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("should produce deterministic hashes for nested objects", () => {
    const hash1 = canonicalHash({ outer: { z: 1, a: 2 }, b: "test" });
    const hash2 = canonicalHash({ b: "test", outer: { a: 2, z: 1 } });
    expect(hash1).toBe(hash2);
  });

  it("should differ from naive JSON.stringify hash when key order differs", () => {
    const { createHash } = require("node:crypto");
    const data1 = { a: 1, b: 2 };
    const data2 = { b: 2, a: 1 };

    // JSON.stringify produces different outputs for different key orders
    const naive1 = createHash("sha256").update(JSON.stringify(data1)).digest("hex");
    const naive2 = createHash("sha256").update(JSON.stringify(data2)).digest("hex");
    expect(naive1).not.toBe(naive2);

    // canonicalHash produces the same output
    const canonical1 = canonicalHash(data1);
    const canonical2 = canonicalHash(data2);
    expect(canonical1).toBe(canonical2);
  });
});
