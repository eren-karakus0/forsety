# Deferred Features

Features that are implemented at the SDK/DB level but not yet exposed through API routes, MCP tools, or dashboard UI.

## ShieldStore (Phase 4)

**Status:** SDK + DB schema complete, not exposed.

### What exists
- `ShieldStoreService` in `packages/sdk/src/services/shield-store.service.ts`
- AES-256-GCM encryption/decryption utilities in `packages/sdk/src/crypto/aes.ts`
- Client-side key derivation from wallet signature in `packages/sdk/src/crypto/key-derivation.ts`
- `encryption_metadata` table in DB schema tracking IVs per resource
- `storeEncrypted()` — encrypts content and stores as RecallVault memory
- `retrieveDecrypted()` — retrieves and decrypts with client-provided key
- `isEncrypted()` — checks if a memory has encryption metadata

### What's needed for Phase 4
- MCP tools: `forsety_shield_store` and `forsety_shield_retrieve`
- API routes: `POST /api/memories/encrypted`, `GET /api/memories/:id/decrypt`
- Dashboard UI: encrypted memory viewer with in-browser decryption
- Client-side key derivation flow (SIWA signature -> AES key)
- Key rotation: re-encrypt all agent memories with a new derived key
- Audit logging for all encryption/decryption operations

### Date
Deferred on 2026-03-14.
