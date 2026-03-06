import { describe, it, expect, vi, beforeEach } from "vitest";
import { ShelbyWrapper } from "../../src/shelby/client.js";

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

import { execSync } from "node:child_process";
const mockExecSync = vi.mocked(execSync);

describe("ShelbyWrapper", () => {
  let wrapper: ShelbyWrapper;

  beforeEach(() => {
    vi.clearAllMocks();
    wrapper = new ShelbyWrapper({
      network: "shelbynet",
      walletAddress: "0xtest",
    });
  });

  describe("checkHealth", () => {
    it("should return health status when CLI is available", async () => {
      mockExecSync
        .mockReturnValueOnce("shelby-cli 0.0.26")
        .mockReturnValueOnce("shelbynet (active)\ntestnet");

      const health = await wrapper.checkHealth();

      expect(health.cliVersion).toBe("shelby-cli 0.0.26");
      expect(health.context).toBe("shelbynet");
      expect(health.connected).toBe(true);
    });

    it("should return disconnected when CLI fails", async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error("command not found");
      });

      const health = await wrapper.checkHealth();

      expect(health.connected).toBe(false);
      expect(health.cliVersion).toBe("unknown");
    });
  });

  describe("getBalance", () => {
    it("should parse balance output", async () => {
      mockExecSync.mockReturnValue(
        "APT: 1.5\nShelbyUSD: 10.0" as never
      );

      const balance = await wrapper.getBalance();

      expect(balance.apt).toBe("1.5");
      expect(balance.shelbyUsd).toBe("10.0");
    });

    it("should return 0 when parsing fails", async () => {
      mockExecSync.mockReturnValue("No balance info" as never);

      const balance = await wrapper.getBalance();

      expect(balance.apt).toBe("0");
      expect(balance.shelbyUsd).toBe("0");
    });
  });

  describe("getAccountBlobs", () => {
    it("should parse blob list output", async () => {
      mockExecSync.mockReturnValue(
        "blob-1  files/test.txt  1024  2026-03-06" as never
      );

      const blobs = await wrapper.getAccountBlobs("testaccount");

      expect(blobs.length).toBeGreaterThan(0);
      expect(blobs[0]?.blobId).toBe("blob-1");
    });
  });

  describe("uploadDataset", () => {
    it("should upload and return result", async () => {
      mockExecSync
        .mockReturnValueOnce("blob_id: test-blob-123" as never)
        .mockReturnValueOnce("abc123def456  /mnt/c/test.txt" as never);

      const result = await wrapper.uploadDataset(
        "C:\\test\\file.txt",
        "forsety/test"
      );

      expect(result.blobName).toBe("forsety/test");
      expect(result.blobId).toBe("test-blob-123");
      expect(result.hash).toBe("abc123def456");
    });
  });

  describe("generateCommitments", () => {
    it("should return parsed commitments", async () => {
      mockExecSync
        .mockReturnValueOnce("" as never) // commitment command
        .mockReturnValueOnce(
          JSON.stringify({ commitments: ["c1", "c2"], hash: "hashval" }) as never
        ); // cat output

      const result = await wrapper.generateCommitments("C:\\test\\file.txt");

      expect(result.commitments).toEqual(["c1", "c2"]);
      expect(result.hash).toBe("hashval");
    });

    it("should fallback on parse failure", async () => {
      mockExecSync
        .mockReturnValueOnce("" as never)
        .mockReturnValueOnce("not json" as never)
        .mockReturnValueOnce("fallbackhash  /mnt/c/test.txt" as never);

      const result = await wrapper.generateCommitments("C:\\test\\file.txt");

      expect(result.commitments).toEqual([]);
    });
  });
});
