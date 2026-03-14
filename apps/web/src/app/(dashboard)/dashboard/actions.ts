"use server";

import { writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { cookies } from "next/headers";
import { verifyJwt } from "@forsety/auth";
import { getForsetyClient } from "@/lib/forsety";
import { getEnv } from "@/lib/env";
import { sanitizeAgent } from "@forsety/sdk";

async function getWalletFromSession(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("forsety-auth")?.value;
  if (!token) return null;
  const payload = await verifyJwt(token, getEnv().JWT_SECRET);
  return payload?.sub ?? null;
}

export interface UploadResult {
  success: boolean;
  error?: string;
  datasetId?: string;
}

export async function uploadDataset(formData: FormData): Promise<UploadResult> {
  const file = formData.get("file") as File | null;
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const license = formData.get("license") as string;

  const ownerAddress = await getWalletFromSession();
  if (!ownerAddress) {
    return { success: false, error: "Not authenticated" };
  }

  if (!name || !license) {
    return { success: false, error: "Missing required fields" };
  }

  if (!file || file.size === 0) {
    return { success: false, error: "File is required" };
  }

  let tempPath: string | null = null;

  try {
    const client = getForsetyClient();

    // Write uploaded file to temp directory for Shelby CLI access
    const uploadDir = join(tmpdir(), "forsety-uploads");
    mkdirSync(uploadDir, { recursive: true });
    // Sanitize filename: strip path separators and special chars
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    tempPath = join(uploadDir, `${Date.now()}-${safeName}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    writeFileSync(tempPath, buffer);

    const result = await client.datasets.upload({
      filePath: tempPath,
      name,
      description: description || undefined,
      ownerAddress,
      license: {
        spdxType: license,
        grantorAddress: ownerAddress,
      },
    });

    return { success: true, datasetId: result.dataset.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  } finally {
    // Cleanup temp file
    if (tempPath) {
      try { unlinkSync(tempPath); } catch { /* ignore */ }
    }
  }
}

export interface EvidenceResult {
  success: boolean;
  error?: string;
  json?: Record<string, unknown>;
  hash?: string;
}

export async function fetchDatasetDetail(id: string) {
  try {
    const wallet = await getWalletFromSession();
    if (!wallet) return null;

    const client = getForsetyClient();
    const result = await client.datasets.getWithLicense(id);
    if (!result || result.dataset.ownerAddress !== wallet) return null;
    return {
      dataset: {
        ...result.dataset,
        createdAt: result.dataset.createdAt.toISOString(),
      },
      licenses: result.licenses.map((l) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
      })),
    };
  } catch {
    return null;
  }
}

export async function generateEvidencePack(datasetId: string): Promise<EvidenceResult> {
  try {
    const wallet = await getWalletFromSession();
    if (!wallet) return { success: false, error: "Not authenticated" };

    const client = getForsetyClient();
    const dataset = await client.datasets.getById(datasetId);
    if (!dataset || dataset.ownerAddress !== wallet) {
      return { success: false, error: "Forbidden" };
    }

    const result = await client.evidence.generatePack(datasetId);
    return {
      success: true,
      json: result.json as unknown as Record<string, unknown>,
      hash: result.hash,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Generation failed",
    };
  }
}

// --- Phase 2: Agent & Audit actions ---

export async function fetchDashboardStats() {
  try {
    const wallet = await getWalletFromSession();
    if (!wallet) return { totalDatasets: 0, registeredAgents: 0, activeAgents: 0 };

    const client = getForsetyClient();
    const [datasets, agents] = await Promise.all([
      client.datasets.listWithLicensesByOwner(wallet),
      client.agents.listByOwner(wallet),
    ]);

    const activeAgents = agents.filter((a) => a.isActive).length;

    return {
      totalDatasets: datasets.length,
      registeredAgents: agents.length,
      activeAgents,
    };
  } catch {
    return { totalDatasets: 0, registeredAgents: 0, activeAgents: 0 };
  }
}

export async function fetchAgents() {
  try {
    const wallet = await getWalletFromSession();
    if (!wallet) return [];

    const client = getForsetyClient();
    const agents = await client.agents.listByOwner(wallet);
    return agents.map((a) => ({
      ...sanitizeAgent(a),
      createdAt: a.createdAt.toISOString(),
      lastSeenAt: a.lastSeenAt?.toISOString() ?? null,
    }));
  } catch {
    return [];
  }
}

export async function fetchAgentDetail(id: string) {
  try {
    const wallet = await getWalletFromSession();
    if (!wallet) return null;
    const client = getForsetyClient();
    const agent = await client.agents.getById(id);
    if (!agent || agent.ownerAddress !== wallet) return null;

    const auditSummary = await client.agentAudit.getSummary(id);

    return {
      agent: {
        ...sanitizeAgent(agent),
        createdAt: agent.createdAt.toISOString(),
        lastSeenAt: agent.lastSeenAt?.toISOString() ?? null,
      },
      auditSummary: {
        ...auditSummary,
        recentActions: auditSummary.recentActions.map((a) => ({
          ...a,
          timestamp: a.timestamp.toISOString(),
        })),
      },
    };
  } catch {
    return null;
  }
}

export async function fetchAgentAuditLogs(
  agentId: string,
  filters?: { action?: string; status?: string; limit?: number }
) {
  try {
    const wallet = await getWalletFromSession();
    if (!wallet) return [];
    const client = getForsetyClient();
    const agent = await client.agents.getById(agentId);
    if (!agent || agent.ownerAddress !== wallet) return [];
    const logs = await client.agentAudit.getByAgent(agentId, filters);
    return logs.map((l) => ({
      ...l,
      timestamp: l.timestamp.toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function fetchAllAuditLogs(
  filters?: {
    agentId?: string | null;
    status?: string;
    resourceId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }
) {
  try {
    const wallet = await getWalletFromSession();
    if (!wallet) return [];

    const client = getForsetyClient();
    const logs = await client.agentAudit.listByOwner(wallet, {
      ...filters,
      dateFrom: filters?.dateFrom ? new Date(filters.dateFrom) : undefined,
      dateTo: filters?.dateTo ? new Date(filters.dateTo) : undefined,
    });
    return logs.map((l) => ({
      ...l,
      timestamp: l.timestamp.toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function countAuditLogs(
  filters?: {
    agentId?: string | null;
    status?: string;
    resourceId?: string;
    dateFrom?: string;
    dateTo?: string;
  }
) {
  try {
    const wallet = await getWalletFromSession();
    if (!wallet) return 0;

    const client = getForsetyClient();
    return client.agentAudit.countByOwner(wallet, {
      status: filters?.status,
    });
  } catch {
    return 0;
  }
}

export async function fetchAllEvidencePacks(filters?: { limit?: number; offset?: number }) {
  try {
    const wallet = await getWalletFromSession();
    if (!wallet) return [];

    const client = getForsetyClient();
    const packs = await client.evidence.listByOwner(wallet, filters);
    return packs.map((p) => ({
      ...p,
      generatedAt: p.generatedAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function fetchEvidencePackById(id: string) {
  try {
    const wallet = await getWalletFromSession();
    if (!wallet) return null;


    const client = getForsetyClient();
    const pack = await client.evidence.getById(id);
    if (!pack) return null;

    // Verify ownership via dataset
    const dataset = await client.datasets.getById(pack.datasetId);
    if (!dataset || dataset.ownerAddress !== wallet) return null;

    const datasetWithLicense = await client.datasets.getWithLicense(pack.datasetId);

    return {
      ...pack,
      generatedAt: pack.generatedAt.toISOString(),
      datasetName: datasetWithLicense?.dataset.name ?? "Unknown",
    };
  } catch {
    return null;
  }
}

export async function fetchAccessLogs(datasetId: string) {
  try {
    const wallet = await getWalletFromSession();
    if (!wallet) return [];
<<<<<<< HEAD

    const client = getForsetyClient();
    const dataset = await client.datasets.getById(datasetId);
    if (!dataset || dataset.ownerAddress !== wallet) return [];

    const logs = await client.access.getByDatasetId(datasetId);
    return logs.map((l) => ({
      ...l,
      timestamp: l.timestamp?.toISOString() ?? null,
    }));
  } catch {
    return [];
  }
}

export async function fetchAllPolicies() {
  try {
    const wallet = await getWalletFromSession();
    if (!wallet) return [];

    const client = getForsetyClient();
    const pols = await client.policies.listByOwner(wallet);
    return pols.map((p) => ({
      ...p,
      expiresAt: p.expiresAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function fetchDatasetsList() {
  try {
    const wallet = await getWalletFromSession();
    if (!wallet) return [];

    const client = getForsetyClient();
    const list = await client.datasets.listByOwner(wallet);
    return list.map((d) => ({ id: d.id, name: d.name }));
  } catch {
    return [];
  }
}

export async function createPolicy(input: {
  datasetId: string;
  allowedAccessors: string[];
  maxReads?: number;
  expiresAt?: string;
}) {
  try {
    const wallet = await getWalletFromSession();
    if (!wallet) return { success: false, error: "Not authenticated" };

    const client = getForsetyClient();
    const dataset = await client.datasets.getById(input.datasetId);
    if (!dataset || dataset.ownerAddress !== wallet) {
      return { success: false, error: "Forbidden" };
    }

    const result = await client.policies.create({
      datasetId: input.datasetId,
      allowedAccessors: input.allowedAccessors,
      maxReads: input.maxReads,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
    });
    return { success: true, policy: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create policy",
    };
  }
}

export async function createShareLink(input: {
  evidencePackId: string;
  mode: "full" | "redacted";
  ttlHours: number;
}) {
  try {
    const client = getForsetyClient();
    const link = await client.share.createShareLink(input);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://forsety.vercel.app";
    return {
      success: true,
      token: link.token,
      url: `${baseUrl}/verify/${link.token}`,
      expiresAt: link.expiresAt.toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create share link",
    };
  }
}

export async function fetchPolicies(datasetId: string) {
  try {
    const wallet = await getWalletFromSession();
    if (!wallet) return [];
    const client = getForsetyClient();
    const dataset = await client.datasets.getWithLicense(datasetId);
    if (!dataset || dataset.dataset.ownerAddress !== wallet) return [];
    return client.policies.getByDatasetId(datasetId);
  } catch {
    return [];
  }
}

// --- Item 2: Update Policy (creates new version) ---

export async function updatePolicy(
  policyId: string,
  input: {
    allowedAccessors: string[];
    maxReads?: number;
    expiresAt?: string;
  }
) {
  try {
    const wallet = await getWalletFromSession();
    if (!wallet) return { success: false, error: "Not authenticated" };

    const client = getForsetyClient();
    const existing = await client.policies.getById(policyId);
    if (!existing) return { success: false, error: "Policy not found" };

    // Verify ownership via dataset
    const dataset = await client.datasets.getById(existing.datasetId);
    if (!dataset || dataset.ownerAddress !== wallet) {
      return { success: false, error: "Forbidden" };
    }

    const result = await client.policies.create({
      datasetId: existing.datasetId,
      allowedAccessors: input.allowedAccessors,
      maxReads: input.maxReads,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
    });
    return { success: true, policy: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update policy",
    };
  }
}

// --- Item 3: Dataset Search & Filter ---

export async function fetchDatasetsWithStatus() {
  try {
    const wallet = await getWalletFromSession();
    if (!wallet) return [];

    const client = getForsetyClient();
    // Use owner-scoped query; list includes non-archived, listAll for including archived
    const allDatasets = (await client.datasets.listAll()).filter(
      (d) => d.ownerAddress === wallet
    );
    if (allDatasets.length === 0) return [];

    const allLicenses = await client.licenses.listAll({ includeRevoked: false, limit: 10000 });
    const licenseMap = new Map<string, string>();
    for (const lic of allLicenses) {
      licenseMap.set(lic.datasetId, lic.spdxType);
    }

    const latestPolicies = await client.policies.getLatestPerDataset();

    return allDatasets.map((d) => {
      const policy = latestPolicies.get(d.id);
      let status: "active" | "warning" | "expired" | "no-policy" = "no-policy";
      if (policy) {
        if (!policy.expiresAt) {
          status = "active";
        } else {
          const exp = new Date(policy.expiresAt);
          const now = new Date();
          if (exp < now) status = "expired";
          else if (exp.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000) status = "warning";
          else status = "active";
        }
      }
      return {
        id: d.id,
        name: d.name,
        license: licenseMap.get(d.id) ?? "-",
        status,
        createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : null,
        blobHash: d.blobHash,
        sizeBytes: d.sizeBytes,
        archivedAt: d.archivedAt ? new Date(d.archivedAt).toISOString() : null,
      };
    });
  } catch {
    return [];
  }
}

// --- Item 4: Violation Count ---

export async function fetchViolationCount() {
  try {
    const wallet = await getWalletFromSession();
    if (!wallet) return 0;

    const client = getForsetyClient();
    return client.agentAudit.countByOwner(wallet, { status: "denied" });
  } catch {
    return 0;
  }
}

// --- Agent Registration ---

export async function registerAgent(input: {
  name: string;
  description?: string;
  permissions?: string[];
  allowedDatasets?: string[];
}) {
  try {
    const wallet = await getWalletFromSession();
    if (!wallet) return { success: false, error: "Not authenticated" };

    const client = getForsetyClient();
    const result = await client.agents.register({
      name: input.name,
      description: input.description,
      ownerAddress: wallet,
      permissions: input.permissions,
      allowedDatasets: input.allowedDatasets,
    });

    return {
      success: true,
      agentId: result.agent.id,
      apiKey: result.apiKey,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Registration failed",
    };
  }
}

// --- Item 6: Bulk Dataset Operations ---

export async function bulkDeleteDatasets(ids: string[]) {
  try {
    const wallet = await getWalletFromSession();
    if (!wallet) return { success: false, error: "Not authenticated" };

    const client = getForsetyClient();
    const results = [];
    for (const id of ids) {
      const dataset = await client.datasets.getById(id);
      if (!dataset || dataset.ownerAddress !== wallet) {
        results.push({ id, archived: false, error: "Forbidden" });
        continue;
      }
      const archived = await client.datasets.archive(id);
      results.push({ id, archived: !!archived });
    }
    return { success: true, results };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Bulk archive failed",
    };
  }
}

export async function bulkExportDatasets(ids: string[]) {
  try {
    const wallet = await getWalletFromSession();
    if (!wallet) return { success: false, error: "Not authenticated" };

    const client = getForsetyClient();
    const data = [];
    for (const id of ids) {
      const dataset = await client.datasets.getById(id);
      if (!dataset || dataset.ownerAddress !== wallet) continue;

      const result = await client.datasets.getWithLicense(id);
      if (result) {
        data.push({
          dataset: {
            ...result.dataset,
            createdAt: result.dataset.createdAt.toISOString(),
          },
          licenses: result.licenses.map((l) => ({
            ...l,
            createdAt: l.createdAt.toISOString(),
          })),
        });
      }
    }
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Bulk export failed",
    };
  }
}
