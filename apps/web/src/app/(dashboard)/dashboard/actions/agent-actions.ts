"use server";

import { getForsetyClient } from "@/lib/forsety";
import { sanitizeAgent } from "@forsety/sdk";
import { withSignedMutation } from "@/lib/with-mutation";
import { withAuth } from "@/lib/with-auth";
import type { SignaturePayload } from "@/lib/types";

export async function fetchAgents() {
  return withAuth(async (wallet) => {
    const client = getForsetyClient();
    const agents = await client.agents.listByOwner(wallet);
    return agents.map((a) => ({
      ...sanitizeAgent(a),
      createdAt: a.createdAt.toISOString(),
      lastSeenAt: a.lastSeenAt?.toISOString() ?? null,
    }));
  }, []).catch((err) => {
    console.error("[fetchAgents]", err);
    return [];
  });
}

export async function fetchAgentDetail(id: string) {
  return withAuth(async (wallet) => {
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
  }, null).catch((err) => {
    console.error("[fetchAgentDetail]", err);
    return null;
  });
}

export async function fetchAgentAuditLogs(
  agentId: string,
  filters?: { action?: string; status?: string; limit?: number }
) {
  return withAuth(async (wallet) => {
    const client = getForsetyClient();
    const agent = await client.agents.getById(agentId);
    if (!agent || agent.ownerAddress !== wallet) return [];
    const logs = await client.agentAudit.getByAgent(agentId, filters);
    return logs.map((l) => ({
      ...l,
      timestamp: l.timestamp.toISOString(),
    }));
  }, []).catch((err) => {
    console.error("[fetchAgentAuditLogs]", err);
    return [];
  });
}

export async function registerAgent(input: {
  name: string;
  description?: string;
  permissions?: string[];
  allowedDatasets?: string[];
}, sig: SignaturePayload) {
  return withSignedMutation(sig, async (wallet, client) => {
    const result = await client.agents.register({
      name: input.name,
      description: input.description,
      ownerAddress: wallet,
      permissions: input.permissions,
      allowedDatasets: input.allowedDatasets,
    });

    return {
      agentId: result.agent.id,
      apiKey: result.apiKey,
    };
  });
}
