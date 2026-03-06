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
