export interface UploadResult {
  blobId: string;
  blobName: string;
  hash: string;
  sizeBytes: number;
}

export interface BlobMetadata {
  blobId: string;
  blobName: string;
  sizeBytes: number;
  createdAt: string;
}

export interface BlobCommitments {
  commitments: string[];
  hash: string;
}

export interface ShelbyWrapperConfig {
  network: string;
  walletAddress?: string;
}

/** Common interface for ShelbyWrapper and ShelbyMockWrapper. */
export interface IShelbyClient {
  uploadDataset(filePath: string, blobName: string): Promise<UploadResult>;
  downloadDataset(blobName: string, outputPath: string): Promise<void>;
}
