-- Phase 3.2: Vector Search (Local Embeddings)
-- Enables pgvector extension and creates embeddings table

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL,
  source_id UUID NOT NULL,
  embedding VECTOR(384) NOT NULL,
  model TEXT NOT NULL DEFAULT 'all-MiniLM-L6-v2',
  text_content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_id)
);

CREATE INDEX IF NOT EXISTS idx_embeddings_cosine
  ON embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
