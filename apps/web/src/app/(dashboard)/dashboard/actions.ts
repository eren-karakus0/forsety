"use server";

import { writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { getForsetyClient } from "@/lib/forsety";
import { sanitizeAgent } from "@forsety/sdk";

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
  const ownerAddress = formData.get("ownerAddress") as string;

  if (!name || !license || !ownerAddress) {
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
    const client = getForsetyClient();
    const result = await client.datasets.getWithLicense(id);
    if (!result) return null;
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
    const client = getForsetyClient();
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
    const client = getForsetyClient();
    const [datasets, agents] = await Promise.all([
      client.datasets.listWithLicenses(),
      client.agents.list(),
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
    const client = getForsetyClient();
    const agents = await client.agents.list();
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
    const client = getForsetyClient();
    const agent = await client.agents.getById(id);
    if (!agent) return null;

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
    const client = getForsetyClient();
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
  filters?: { agentId?: string | null; status?: string; limit?: number }
) {
  try {
    const client = getForsetyClient();
    const logs = await client.agentAudit.listAll(filters);
    return logs.map((l) => ({
      ...l,
      timestamp: l.timestamp.toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function fetchAccessLogs(datasetId: string) {
  try {
    const client = getForsetyClient();
    const logs = await client.access.getByDatasetId(datasetId);
    return logs.map((l) => ({
      ...l,
      timestamp: l.timestamp?.toISOString() ?? new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function fetchPolicies(datasetId: string) {
  try {
    const client = getForsetyClient();
    return client.policies.getByDatasetId(datasetId);
  } catch {
    return [];
  }
}
