import { describe, it, expect, afterEach } from "vitest";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ShelbyMockWrapper } from "../../src/shelby/mock-client.js";

describe("ShelbyMockWrapper", () => {
  const mock = new ShelbyMockWrapper({
    network: "testnet",
    walletAddress: "0xtest",
  });

  it("should return mock upload result", async () => {
    const result = await mock.uploadDataset("/tmp/test.txt", "test-blob");
    expect(result.blobId).toMatch(/^mock-/);
    expect(result.blobName).toBe("test-blob");
    expect(result.hash).toBeDefined();
    expect(result.hash.length).toBe(64);
  });

  it("should report as not connected in checkHealth", async () => {
    const health = await mock.checkHealth();
    expect(health.cliVersion).toBe("mock");
    expect(health.connected).toBe(false);
    expect(health.context).toBe("testnet");
  });

  it("should track uploaded blobs in getAccountBlobs", async () => {
    const freshMock = new ShelbyMockWrapper({
      network: "testnet",
    });
    await freshMock.uploadDataset("/tmp/a.txt", "blob-a");
    await freshMock.uploadDataset("/tmp/b.txt", "blob-b");

    const blobs = await freshMock.getAccountBlobs();
    expect(blobs).toHaveLength(2);
  });

  it("should remove blob on delete", async () => {
    const freshMock = new ShelbyMockWrapper({ network: "testnet" });
    await freshMock.uploadDataset("/tmp/x.txt", "blob-x");
    await freshMock.deleteBlob("blob-x");

    const blobs = await freshMock.getAccountBlobs();
    expect(blobs).toHaveLength(0);
  });

  describe("downloadDataset", () => {
    const tempPath = join(tmpdir(), "forsety-mock-download-test.txt");

    afterEach(() => {
      try { unlinkSync(tempPath); } catch { /* ignore */ }
    });

    it("should write placeholder file on download", async () => {
      await mock.downloadDataset("test-blob", tempPath);

      expect(existsSync(tempPath)).toBe(true);
      const content = readFileSync(tempPath, "utf-8");
      expect(content).toContain("[Forsety Mock]");
      expect(content).toContain("test-blob");
    });

    it("should include timestamp in placeholder content", async () => {
      await mock.downloadDataset("blob-ts", tempPath);

      const content = readFileSync(tempPath, "utf-8");
      expect(content).toContain("Generated at:");
      // ISO timestamp pattern
      expect(content).toMatch(/\d{4}-\d{2}-\d{2}T/);
    });
  });
});
