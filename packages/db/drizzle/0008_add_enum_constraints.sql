-- Enum CHECK constraints for runtime validation
ALTER TABLE access_logs ADD CONSTRAINT chk_operation_type
  CHECK (operation_type IN ('read', 'download', 'verify'));

ALTER TABLE agent_audit_logs ADD CONSTRAINT chk_audit_status
  CHECK (status IN ('success', 'denied', 'error'));

ALTER TABLE shared_evidence_links ADD CONSTRAINT chk_share_mode
  CHECK (mode IN ('full', 'redacted'));
