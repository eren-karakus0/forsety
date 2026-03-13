# Forsety API Reference

Base URL: `/api`

## Authentication

All endpoints require authentication via one of:

| Method | Header / Cookie | Identity Resolution | Trust Level |
|--------|----------------|---------------------|-------------|
| JWT Cookie | `forsety-auth` cookie (set by SIWA auth flow) | Wallet address from token `sub` claim | Trusted |
| Agent API Key | `X-API-Key: fsy_...` or `Authorization: Bearer fsy_...` | `ownerAddress` from agent record in DB | Trusted |
| Global API Key | `X-API-Key: <FORSETY_API_KEY>` + `?accessor=0x...` | Address from query parameter | Untrusted (backward-compat) |

**Authorization model:** Authentication proves identity. Write operations (archive, restore, update, revoke) additionally check that the authenticated caller is the **dataset owner** (`dataset.ownerAddress === accessor`).

### Error Responses

| Status | Meaning |
|--------|---------|
| `401` | Missing or invalid credentials |
| `403` | Authenticated but not authorized (not owner, or policy denied) |
| `400` | Invalid request body or query parameters |
| `404` | Resource not found |
| `500` | Internal server error (details hidden in production) |

---

## Datasets

### `GET /api/datasets`

List all active (non-archived) datasets with licenses.

**Auth:** `validateAuth` (any valid auth method)

**Response:**
```json
{
  "datasets": [
    {
      "id": "uuid",
      "name": "string",
      "ownerAddress": "0x...",
      "shelbyBlobName": "string",
      "blobHash": "string | null",
      "archivedAt": "null",
      "license": { "id": "uuid", "spdxType": "MIT", ... } | null
    }
  ]
}
```

### `GET /api/datasets/[id]`

Get dataset details with license.

**Auth:** `validateAuth`

**Response:** `200` dataset object | `404`

### `DELETE /api/datasets/[id]` — Archive (soft-delete)

Archives a dataset. The dataset remains in the database but is excluded from default list queries. Access logs and evidence packs are preserved.

**Auth:** `resolveAccessor` (owner required)

**Response:** `200` archived dataset object | `403` not owner | `404`

### `PATCH /api/datasets/[id]` — Restore

Restores an archived dataset.

**Auth:** `resolveAccessor` (owner required)

**Request body:**
```json
{ "action": "restore" }
```

**Response:** `200` restored dataset object | `400` invalid action | `403` not owner | `404`

### `GET /api/datasets/[id]/download`

Download dataset file with policy enforcement.

**Flow:**
1. `resolveAccessor` — authenticate and identify caller
2. `checkAccess` — read-only policy gate (no quota consumed)
3. Shelby download to temp file
4. `logAccess` — quota consumed only after successful download
5. Stream response to client, clean up temp file

**Auth:** `resolveAccessor`

**Query params:** `?accessor=0x...` (only for global API key auth)

**Response headers:**
```
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="<safe-name>"
Content-Length: <bytes>
X-Blob-Hash: <sha256> (if available)
X-Access-Log-Id: <uuid>
```

**Errors:** `401` | `403` (policy denied) | `404` (dataset or blob not found) | `500`

### `HEAD /api/datasets/[id]/download` — Preflight

Auth + policy check without triggering download or consuming quota.

**Auth:** `resolveAccessor`

**Response:** `200` (allowed) | `401` | `403` | `404`

---

## Licenses

### `GET /api/licenses`

List licenses with optional filters.

**Auth:** `validateAuth`

**Query params:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `datasetId` | UUID | — | Filter by dataset |
| `includeRevoked` | boolean | `false` | Include revoked licenses |
| `limit` | int (1-1000) | `100` | Page size |
| `offset` | int (>=0) | `0` | Page offset |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "datasetId": "uuid",
      "spdxType": "MIT",
      "grantorAddress": "0x...",
      "terms": "string | null",
      "termsHash": "sha256-hex",
      "revokedAt": "ISO-8601 | null",
      "createdAt": "ISO-8601"
    }
  ]
}
```

**Validation errors:** `400` with `{ error, details }` on invalid query params (e.g., non-UUID datasetId, negative offset, limit > 1000).

### `POST /api/licenses`

Attach a new license to a dataset. `termsHash` is always computed server-side from the canonical payload `{ spdxType, grantorAddress, terms }`.

**Auth:** `resolveAccessor` (dataset owner required)

**Request body:**
```json
{
  "datasetId": "uuid",
  "spdxType": "MIT",
  "grantorAddress": "0x...",
  "terms": "optional license text"
}
```

**Response:** `201` license object | `400` missing fields | `403` not owner | `404` dataset not found

### `GET /api/licenses/[id]`

Get license by ID.

**Auth:** `validateAuth`

**Response:** `200` license object | `404`

### `PATCH /api/licenses/[id]`

Update license fields. At least one of `spdxType` or `terms` is required. `termsHash` is always recalculated server-side from the canonical payload.

Cannot update a revoked license.

**Auth:** `resolveAccessor` (dataset owner required)

**Request body:**
```json
{
  "spdxType": "Apache-2.0",
  "terms": "updated license text"
}
```

**Response:** `200` updated license | `400` (no fields / revoked) | `403` not owner | `404`

### `DELETE /api/licenses/[id]` — Revoke

Soft-revoke a license (sets `revokedAt` timestamp). Revoked licenses are excluded from access proof hash calculations and from default list queries.

**Auth:** `resolveAccessor` (dataset owner required)

**Response:** `200` revoked license object | `403` not owner | `404`

---

## Access Logs

### `GET /api/access`

Query access logs with filters and pagination.

**Auth:** `validateAuth`

**Query params:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `datasetId` | UUID | — | Filter by dataset |
| `accessor` | string | — | Filter by accessor address |
| `operationType` | enum | — | `read`, `download`, or `verify` |
| `from` | ISO-8601 | — | Start date (inclusive) |
| `to` | ISO-8601 | — | End date (inclusive) |
| `limit` | int (1-1000) | `50` | Page size |
| `offset` | int (>=0) | `0` | Page offset |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "datasetId": "uuid",
      "accessorAddress": "0x...",
      "operationType": "download",
      "timestamp": "ISO-8601",
      ...
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 50,
    "offset": 0
  }
}
```

**Validation errors:** `400` on invalid params (non-UUID datasetId, invalid date, invalid operationType, NaN limit/offset, negative offset).

### `POST /api/access`

Log a data access event. `accessorAddress` is resolved from the auth context (not from request body).

**Auth:** `resolveAccessor`

**Request body:**
```json
{
  "datasetId": "uuid",
  "operationType": "read | download | verify",
  "agentId": "optional-agent-uuid"
}
```

**Response:** `201` access log entry | `400` missing fields / invalid operationType | `403` access denied by policy

---

## Database Migration

### Migration 0006: `archived_at` + `revoked_at`

**File:** `packages/db/drizzle/0006_add_archived_at_and_revoked_at.sql`

```sql
ALTER TABLE "datasets" ADD COLUMN "archived_at" timestamp with time zone;
ALTER TABLE "licenses" ADD COLUMN "revoked_at" timestamp with time zone;
```

**Apply:**
```bash
pnpm --filter @forsety/db db:migrate
```

**Behavior changes after migration:**

| Before | After |
|--------|-------|
| `DELETE /api/datasets/[id]` hard-deletes (CASCADE) | Archives (sets `archived_at`), preserves evidence chain |
| No license revocation | `DELETE /api/licenses/[id]` sets `revokedAt` |
| `GET /api/datasets` returns all | Returns only active (`archived_at IS NULL`) |
| `GET /api/licenses` returns all | Returns only active (`revoked_at IS NULL`) by default |
| Access proof includes all licenses | Access proof excludes revoked licenses |

**Rollback (if needed):**
```sql
ALTER TABLE "datasets" DROP COLUMN "archived_at";
ALTER TABLE "licenses" DROP COLUMN "revoked_at";
```

Both columns are nullable with no default, so the migration is non-destructive and backward-compatible. Existing rows will have `NULL` values (treated as active/non-revoked).
