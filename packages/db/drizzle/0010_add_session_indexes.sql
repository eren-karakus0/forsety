-- Session lookup indexes for auth verification and cleanup
CREATE INDEX IF NOT EXISTS idx_sessions_wallet_address
  ON sessions (wallet_address);

CREATE INDEX IF NOT EXISTS idx_sessions_expires_at
  ON sessions (expires_at);
