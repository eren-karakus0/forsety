import type { ForsetyConfig, EvidencePack } from "./types.js";

export class ForsetyClient {
  private config: ForsetyConfig;

  constructor(config: ForsetyConfig = {}) {
    this.config = {
      shelbyRpcUrl: config.shelbyRpcUrl ?? "https://rpc.shelbynet.shelby.xyz",
      apiBaseUrl: config.apiBaseUrl ?? "http://localhost:3000/api",
      ...config,
    };
  }

  // Phase 1: Upload dataset and create evidence pack
  async createEvidencePack(
    _datasetPath: string,
    _policyId: string
  ): Promise<EvidencePack> {
    throw new Error("Not implemented — Phase 1");
  }

  // Phase 1: Verify an evidence pack
  async verifyEvidencePack(_evidencePackId: string): Promise<boolean> {
    throw new Error("Not implemented — Phase 1");
  }

  // Phase 1: Get evidence pack by ID
  async getEvidencePack(_id: string): Promise<EvidencePack | null> {
    throw new Error("Not implemented — Phase 1");
  }
}
