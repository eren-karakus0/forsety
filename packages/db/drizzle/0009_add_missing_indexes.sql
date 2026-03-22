-- Missing indexes identified in security audit

-- Agent audit logs: resource-type + resource-id queries
CREATE INDEX IF NOT EXISTS idx_agent_audit_logs_resource
  ON agent_audit_logs (resource_type, resource_id);

-- Shared evidence links: token lookup (used in public verify)
CREATE UNIQUE INDEX IF NOT EXISTS idx_shared_evidence_links_token
  ON shared_evidence_links (token);
