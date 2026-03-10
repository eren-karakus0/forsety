-- Phase 0-3: Shared Evidence Links
-- Adds shared_evidence_links table for public verification share links

CREATE TABLE IF NOT EXISTS shared_evidence_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_pack_id UUID NOT NULL REFERENCES evidence_packs(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  mode TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_shared_evidence_links_token ON shared_evidence_links(token);
