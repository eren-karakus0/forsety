-- Phase 3.4: ShieldStore Encryption
-- Adds encryption_metadata table for tracking encrypted resources

CREATE TABLE IF NOT EXISTS encryption_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  algorithm TEXT NOT NULL DEFAULT 'aes-256-gcm',
  iv TEXT NOT NULL,
  key_derivation_version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (resource_type, resource_id)
);
