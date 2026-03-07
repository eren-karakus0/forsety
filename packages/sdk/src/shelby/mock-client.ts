import { createHash } from "node:crypto";
import type {
  UploadResult,
  BlobMetadata,
  BlobCommitments,
  ShelbyWrapperConfig,
} from "./types.js";

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
    _filePath: string,
    blobName: string,
    _expiration: string = "in 30 days"
  ): Promise<UploadResult> {
    const blobId = `mock-${createHash("sha256").update(blobName + Date.now()).digest("hex").slice(0, 16)}`;
    const hash = createHash("sha256").update(blobName).digest("hex");

    this.blobs.set(blobName, {
      blobId,
      blobName,
      sizeBytes: 0,
      createdAt: new Date().toISOString(),
    });

    return { blobId, blobName, hash, sizeBytes: 0 };
  }

  async downloadDataset(
    _blobName: string,
    _outputPath: string
  ): Promise<void> {
    // No-op in mock mode
  }

  async deleteBlob(blobName: string): Promise<void> {
    this.blobs.delete(blobName);
  }

  async getAccountBlobs(_account?: string): Promise<BlobMetadata[]> {
    return Array.from(this.blobs.values());
  }

  async generateCommitments(_filePath: string): Promise<BlobCommitments> {
    return {
      commitments: [],
      hash: createHash("sha256").update("mock").digest("hex"),
    };
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

  computeFileHash(_filePath: string): string {
    return createHash("sha256").update("mock-file").digest("hex");
  }
}
