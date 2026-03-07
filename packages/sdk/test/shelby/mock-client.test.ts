import { describe, it, expect } from "vitest";
import { ShelbyMockWrapper } from "../../src/shelby/mock-client.js";

describe("ShelbyMockWrapper", () => {
  const mock = new ShelbyMockWrapper({
    network: "shelbynet",
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
    expect(health.context).toBe("shelbynet");
  });

  it("should track uploaded blobs in getAccountBlobs", async () => {
    const freshMock = new ShelbyMockWrapper({
      network: "shelbynet",
    });
    await freshMock.uploadDataset("/tmp/a.txt", "blob-a");
    await freshMock.uploadDataset("/tmp/b.txt", "blob-b");

    const blobs = await freshMock.getAccountBlobs();
    expect(blobs).toHaveLength(2);
  });

  it("should remove blob on delete", async () => {
    const freshMock = new ShelbyMockWrapper({ network: "shelbynet" });
    await freshMock.uploadDataset("/tmp/x.txt", "blob-x");
    await freshMock.deleteBlob("blob-x");

    const blobs = await freshMock.getAccountBlobs();
    expect(blobs).toHaveLength(0);
  });
});
