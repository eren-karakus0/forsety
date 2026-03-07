import { createDb } from "@forsety/db";
import type { Database } from "@forsety/db";
import type { ForsetyConfig } from "./types.js";
import { ShelbyWrapper } from "./shelby/client.js";
import { ShelbyMockWrapper } from "./shelby/mock-client.js";
import { DatasetService } from "./services/dataset.service.js";
import { LicenseService } from "./services/license.service.js";
import { PolicyService } from "./services/policy.service.js";
import { AccessService } from "./services/access.service.js";
import { EvidenceService } from "./services/evidence.service.js";
import { AgentService } from "./services/agent.service.js";
import { RecallVaultService } from "./services/recall-vault.service.js";
import { AgentAuditService } from "./services/agent-audit.service.js";
import { VectorSearchService } from "./services/vector-search.service.js";
import { LocalEmbedder } from "./embeddings/local-embedder.js";
import type { Embedder } from "./embeddings/local-embedder.js";

export class ForsetyClient {
  private config: ForsetyConfig;
  private db: Database;
  private shelby: ShelbyWrapper | ShelbyMockWrapper;

  public readonly datasets: DatasetService;
  public readonly licenses: LicenseService;
  public readonly policies: PolicyService;
  public readonly access: AccessService;
  public readonly evidence: EvidenceService;
  public readonly agents: AgentService;
  public readonly recallVault: RecallVaultService;
  public readonly agentAudit: AgentAuditService;
  public readonly vectorSearch: VectorSearchService;

  constructor(config: ForsetyConfig) {
    this.config = {
      shelbyNetwork: config.shelbyNetwork ?? "shelbynet",
      apiBaseUrl: config.apiBaseUrl ?? "http://localhost:3000/api",
      shelbyMode: config.shelbyMode ?? "live",
      ...config,
    };

    if (!config.databaseUrl) {
      throw new Error("databaseUrl is required in ForsetyConfig");
    }

    this.db = createDb(config.databaseUrl);

    const shelbyConfig = {
      network: this.config.shelbyNetwork!,
      walletAddress: this.config.shelbyWalletAddress,
    };

    this.shelby =
      this.config.shelbyMode === "mock"
        ? new ShelbyMockWrapper(shelbyConfig)
        : new ShelbyWrapper(shelbyConfig);

    this.datasets = new DatasetService(
      this.db,
      this.shelby as ShelbyWrapper
    );
    this.licenses = new LicenseService(this.db);
    this.policies = new PolicyService(this.db);
    this.access = new AccessService(
      this.db,
      this.policies,
      this.shelby as ShelbyWrapper
    );
    this.evidence = new EvidenceService(this.db);
    this.agents = new AgentService(this.db);
    this.recallVault = new RecallVaultService(this.db);
    this.agentAudit = new AgentAuditService(this.db);

    const embedder: Embedder = new LocalEmbedder();
    this.vectorSearch = new VectorSearchService(this.db, embedder);
  }

  getDb(): Database {
    return this.db;
  }

  getShelby(): ShelbyWrapper | ShelbyMockWrapper {
    return this.shelby;
  }
}
