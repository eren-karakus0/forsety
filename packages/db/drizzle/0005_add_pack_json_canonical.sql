-- Fix: Evidence hash determinism
-- Adds pack_json_canonical TEXT column to store canonical (RFC 8785) JSON
-- for deterministic SHA-256 hash verification (jsonb does not preserve key order)

ALTER TABLE evidence_packs ADD COLUMN IF NOT EXISTS pack_json_canonical TEXT;
