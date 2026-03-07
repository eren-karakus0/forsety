export { ForsetyClient } from "./client.js";

export type {
  EvidencePack,
  DatasetLicense,
  AccessPolicy,
  ForsetyConfig,
  UploadDatasetInput,
  CreatePolicyInput,
  LogAccessInput,
} from "./types.js";

export {
  EvidencePackSchema,
  DatasetLicenseSchema,
  AccessPolicySchema,
  UploadDatasetInputSchema,
  CreatePolicyInputSchema,
  LogAccessInputSchema,
} from "./types.js";

export {
  ForsetyError,
  ForsetyAuthError,
  ForsetyUploadError,
  ForsetyValidationError,
} from "./errors.js";

export { ShelbyWrapper } from "./shelby/client.js";
export { ShelbyMockWrapper } from "./shelby/mock-client.js";
export type {
  UploadResult,
  BlobMetadata,
  BlobCommitments,
  ShelbyWrapperConfig,
} from "./shelby/types.js";

export { DatasetService } from "./services/dataset.service.js";
export { LicenseService } from "./services/license.service.js";
export { PolicyService } from "./services/policy.service.js";
export { AccessService } from "./services/access.service.js";
export { EvidenceService } from "./services/evidence.service.js";
export type { EvidencePackData } from "./services/evidence.service.js";

export { AgentService, sanitizeAgent } from "./services/agent.service.js";
export type { RegisterAgentInput } from "./services/agent.service.js";

export { RecallVaultService } from "./services/recall-vault.service.js";
export type {
  StoreMemoryInput,
  SearchMemoryQuery,
} from "./services/recall-vault.service.js";

export { AgentAuditService } from "./services/agent-audit.service.js";
export type {
  LogAuditInput,
  AuditSummary,
} from "./services/agent-audit.service.js";
