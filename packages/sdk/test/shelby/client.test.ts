import { describe, it, expect, vi, beforeEach } from "vitest";
import { ShelbyWrapper } from "../../src/shelby/client.js";

vi.mock("node:child_process", () => ({
  execFileSync: vi.fn(),
}));

vi.mock("node:fs", () => ({
  readFileSync: vi.fn(),
  statSync: vi.fn(),
}));

import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";

const mockExecFileSync = vi.mocked(execFileSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockStatSync = vi.mocked(statSync);

/**
 * Extract the bash -lc command string from an execFileSync call.
 * Call pattern: execFileSync("wsl", ["-e", "bash", "-lc", <cmd>], opts)
 */
function getShellCommand(callIndex: number): string {
  const call = mockExecFileSync.mock.calls[callIndex];
  if (!call) throw new Error(`No call at index ${callIndex}`);
  const args = call[1] as string[];
  // Find the -lc arg — the command is the next element
  const lcIdx = args.indexOf("-lc");
  return lcIdx >= 0 ? args[lcIdx + 1]! : "";
}

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
      mockExecFileSync
        .mockReturnValueOnce("shelby-cli 0.0.26" as never)
        .mockReturnValueOnce("shelbynet (active)\ntestnet" as never);

      const health = await wrapper.checkHealth();

      expect(health.cliVersion).toBe("shelby-cli 0.0.26");
      expect(health.context).toBe("shelbynet");
      expect(health.connected).toBe(true);
    });

    it("should return disconnected when CLI fails", async () => {
      mockExecFileSync.mockImplementation(() => {
        throw new Error("command not found");
      });

      const health = await wrapper.checkHealth();

      expect(health.connected).toBe(false);
      expect(health.cliVersion).toBe("unknown");
    });
  });

  describe("getBalance", () => {
    it("should parse balance output", async () => {
      mockExecFileSync.mockReturnValue("APT: 1.5\nShelbyUSD: 10.0" as never);

      const balance = await wrapper.getBalance();

      expect(balance.apt).toBe("1.5");
      expect(balance.shelbyUsd).toBe("10.0");
    });

    it("should return 0 when parsing fails", async () => {
      mockExecFileSync.mockReturnValue("No balance info" as never);

      const balance = await wrapper.getBalance();

      expect(balance.apt).toBe("0");
      expect(balance.shelbyUsd).toBe("0");
    });

    it("should call CLI with correct contract: shelby account balance", async () => {
      mockExecFileSync.mockReturnValue("APT: 1.0\nShelbyUSD: 5.0" as never);

      await wrapper.getBalance();

      const cmd = getShellCommand(0);
      expect(cmd).toBe("shelby account balance");
    });
  });

  describe("getAccountBlobs", () => {
    it("should parse blob list output", async () => {
      mockExecFileSync.mockReturnValue(
        "blob-1  files/test.txt  1024  2026-03-06" as never
      );

      const blobs = await wrapper.getAccountBlobs("testaccount");

      expect(blobs.length).toBeGreaterThan(0);
      expect(blobs[0]?.blobId).toBe("blob-1");
    });

    it("should call CLI with correct contract: shelby account blobs -a <account>", async () => {
      mockExecFileSync.mockReturnValue("" as never);

      await wrapper.getAccountBlobs("myaccount");

      const cmd = getShellCommand(0);
      expect(cmd).toBe("shelby account blobs -a myaccount");
    });

    it("should omit -a flag when no account specified", async () => {
      mockExecFileSync.mockReturnValue("" as never);

      await wrapper.getAccountBlobs();

      const cmd = getShellCommand(0);
      expect(cmd).toBe("shelby account blobs");
    });
  });

  describe("uploadDataset — CLI contract", () => {
    it("should call: shelby upload [source] [destination] -e <expiration>", async () => {
      mockExecFileSync.mockReturnValue("blob_id: test-blob-123" as never);
      mockReadFileSync.mockReturnValue(Buffer.from("test content") as never);
      mockStatSync.mockReturnValue({ size: 1024 } as never);

      await wrapper.uploadDataset("C:\\test\\file.txt", "forsety/test", "in 30 days");

      const cmd = getShellCommand(0);
      // Contract: shelby upload [source] [destination] -e <expiration> --output-commitments <file> --assume-yes
      expect(cmd).toContain("shelby upload /mnt/c/test/file.txt forsety/test");
      expect(cmd).toContain("-e");
      expect(cmd).toContain("in 30 days");
      expect(cmd).toContain("--assume-yes");
      // Must NOT contain --name (deprecated/nonexistent flag)
      expect(cmd).not.toContain("--name");
    });

    it("should return upload result", async () => {
      mockExecFileSync.mockReturnValue("blob_id: test-blob-123" as never);
      mockReadFileSync.mockReturnValue(Buffer.from("test content") as never);
      mockStatSync.mockReturnValue({ size: 1024 } as never);

      const result = await wrapper.uploadDataset("C:\\test\\file.txt", "forsety/test");

      expect(result.blobName).toBe("forsety/test");
      expect(result.blobId).toBe("test-blob-123");
      expect(result.hash).toBeDefined();
      expect(result.sizeBytes).toBe(1024);
    });

    it("should default expiration to 'in 30 days'", async () => {
      mockExecFileSync.mockReturnValue("" as never);
      mockReadFileSync.mockReturnValue(Buffer.from("x") as never);
      mockStatSync.mockReturnValue({ size: 1 } as never);

      await wrapper.uploadDataset("C:\\test.txt", "test");

      const cmd = getShellCommand(0);
      expect(cmd).toContain("'in 30 days'");
    });
  });

  describe("downloadDataset — CLI contract", () => {
    it("should call: shelby download [source] [destination] -f", async () => {
      mockExecFileSync.mockReturnValue("" as never);

      await wrapper.downloadDataset("forsety/my-data", "C:\\output\\data.txt");

      const cmd = getShellCommand(0);
      // Contract: shelby download [source] [destination] -f
      expect(cmd).toContain("shelby download forsety/my-data /mnt/c/output/data.txt -f");
      // Must NOT have account as first positional arg
      expect(cmd).not.toMatch(/download\s+\S+\s+forsety/);
    });
  });

  describe("deleteBlob — CLI contract", () => {
    it("should call: shelby delete [destination] --assume-yes", async () => {
      mockExecFileSync.mockReturnValue("" as never);

      await wrapper.deleteBlob("forsety/test-blob");

      const cmd = getShellCommand(0);
      expect(cmd).toBe("shelby delete forsety/test-blob --assume-yes");
    });
  });

  describe("generateCommitments — CLI contract", () => {
    it("should call: shelby commitment <input> <output>", async () => {
      mockExecFileSync
        .mockReturnValueOnce("" as never)
        .mockReturnValueOnce(
          JSON.stringify({ commitments: ["c1", "c2"], hash: "hashval" }) as never
        );

      const result = await wrapper.generateCommitments("C:\\test\\file.txt");

      const cmd = getShellCommand(0);
      expect(cmd).toContain("shelby commitment /mnt/c/test/file.txt /tmp/forsety-commitment-output.json");
      expect(result.commitments).toEqual(["c1", "c2"]);
      expect(result.hash).toBe("hashval");
    });

    it("should fallback on parse failure", async () => {
      mockExecFileSync
        .mockReturnValueOnce("" as never)
        .mockImplementationOnce(() => { throw new Error("cat failed"); });

      mockReadFileSync.mockReturnValue(Buffer.from("test content") as never);

      const result = await wrapper.generateCommitments("C:\\test\\file.txt");

      expect(result.commitments).toEqual([]);
      expect(result.hash).toBeDefined();
    });
  });
});
