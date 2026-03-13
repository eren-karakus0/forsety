-- Access Logs (most frequently queried)
CREATE INDEX IF NOT EXISTS idx_access_logs_dataset_timestamp
  ON access_logs (dataset_id, "timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_accessor_timestamp
  ON access_logs (accessor_address, "timestamp" DESC);

-- Datasets
CREATE INDEX IF NOT EXISTS idx_datasets_owner_archived
  ON datasets (owner_address, archived_at, created_at);

-- Policies
CREATE INDEX IF NOT EXISTS idx_policies_dataset_version
  ON policies (dataset_id, version DESC);

-- Licenses
CREATE INDEX IF NOT EXISTS idx_licenses_dataset_revoked
  ON licenses (dataset_id, revoked_at, created_at DESC);

-- Agents
CREATE INDEX IF NOT EXISTS idx_agents_owner_active
  ON agents (owner_address, is_active);

-- Agent Audit Logs
CREATE INDEX IF NOT EXISTS idx_agent_audit_logs_agent_timestamp
  ON agent_audit_logs (agent_id, "timestamp" DESC);

-- Evidence Packs
CREATE INDEX IF NOT EXISTS idx_evidence_packs_dataset
  ON evidence_packs (dataset_id);
