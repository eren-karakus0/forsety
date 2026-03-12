import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { normalize } from "node:path";
import type {
  UploadResult,
  BlobMetadata,
  BlobCommitments,
  ShelbyWrapperConfig,
} from "./types.js";

function isSafePath(filePath: string): boolean {
  return !normalize(filePath).includes("..");
}

/**
 * Mock Shelby wrapper for development/testing when devnet is unavailable.
 * All operations succeed locally without any CLI calls.
 */
export class ShelbyMockWrapper {
  private config: ShelbyWrapperConfig;
  private blobs: Map<string, BlobMetadata> = new Map();

  constructor(config: ShelbyWrapperConfig) {
    this.config = config;
  }

  async uploadDataset(
    filePath: string,
    blobName: string,
    _expiration: string = "in 30 days"
  ): Promise<UploadResult> {
    const blobId = `mock-${createHash("sha256").update(blobName + Date.now()).digest("hex").slice(0, 16)}`;

    // Use actual file content for hash/size when file exists (dev mode)
    let hash: string;
    let sizeBytes: number;
    if (isSafePath(filePath) && existsSync(filePath)) {
      const content = readFileSync(filePath);
      hash = createHash("sha256").update(content).digest("hex");
      sizeBytes = content.length;
    } else {
      hash = createHash("sha256").update(blobName).digest("hex");
      sizeBytes = 0;
    }

    this.blobs.set(blobName, {
      blobId,
      blobName,
      sizeBytes,
      createdAt: new Date().toISOString(),
    });

    return { blobId, blobName, hash, sizeBytes };
  }

  async downloadDataset(
    blobName: string,
    outputPath: string
  ): Promise<void> {
    const { writeFileSync } = await import("node:fs");
    writeFileSync(
      outputPath,
      `[Forsety Mock] Placeholder content for blob: ${blobName}\nGenerated at: ${new Date().toISOString()}\n`
    );
  }

  async deleteBlob(blobName: string): Promise<void> {
    this.blobs.delete(blobName);
  }

  async getAccountBlobs(_account?: string): Promise<BlobMetadata[]> {
    return Array.from(this.blobs.values());
  }

  async generateCommitments(filePath: string): Promise<BlobCommitments> {
    let hash: string;
    if (isSafePath(filePath) && existsSync(filePath)) {
      const content = readFileSync(filePath);
      hash = createHash("sha256").update(content).digest("hex");
    } else {
      hash = createHash("sha256").update("mock").digest("hex");
    }

    return { commitments: [], hash };
  }

  async checkHealth(): Promise<{
    cliVersion: string;
    context: string;
    connected: boolean;
  }> {
    return {
      cliVersion: "mock",
      context: this.config.network,
      connected: false,
    };
  }

  async getBalance(): Promise<{ apt: string; shelbyUsd: string }> {
    return { apt: "0", shelbyUsd: "0" };
  }

  computeFileHash(filePath: string): string {
    if (isSafePath(filePath) && existsSync(filePath)) {
      const content = readFileSync(filePath);
      return createHash("sha256").update(content).digest("hex");
    }
    return createHash("sha256").update("mock-file").digest("hex");
  }
}
