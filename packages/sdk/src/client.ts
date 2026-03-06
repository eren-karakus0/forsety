import { createDb } from "@forsety/db";
import type { Database } from "@forsety/db";
import type { ForsetyConfig } from "./types.js";
import { ShelbyWrapper } from "./shelby/client.js";
import { DatasetService } from "./services/dataset.service.js";
import { LicenseService } from "./services/license.service.js";
import { PolicyService } from "./services/policy.service.js";
import { AccessService } from "./services/access.service.js";
import { EvidenceService } from "./services/evidence.service.js";

export class ForsetyClient {
  private config: ForsetyConfig;
  private db: Database;
  private shelby: ShelbyWrapper;

  public readonly datasets: DatasetService;
  public readonly licenses: LicenseService;
  public readonly policies: PolicyService;
  public readonly access: AccessService;
  public readonly evidence: EvidenceService;

  constructor(config: ForsetyConfig) {
    this.config = {
      shelbyNetwork: config.shelbyNetwork ?? "shelbynet",
      apiBaseUrl: config.apiBaseUrl ?? "http://localhost:3000/api",
      ...config,
    };

    if (!config.databaseUrl) {
      throw new Error("databaseUrl is required in ForsetyConfig");
    }

    this.db = createDb(config.databaseUrl);
    this.shelby = new ShelbyWrapper({
      network: this.config.shelbyNetwork!,
      walletAddress: this.config.shelbyWalletAddress,
    });

    this.datasets = new DatasetService(this.db, this.shelby);
    this.licenses = new LicenseService(this.db);
    this.policies = new PolicyService(this.db);
    this.access = new AccessService(this.db, this.policies, this.shelby);
    this.evidence = new EvidenceService(this.db);
  }

  getDb(): Database {
    return this.db;
  }

  getShelby(): ShelbyWrapper {
    return this.shelby;
  }
}
