"use server";

import * as Sentry from "@sentry/nextjs";
import { getForsetyClient } from "@/lib/forsety";
import { sanitizeAgent } from "@forsety/sdk";
import { withSignedMutation } from "@/lib/with-mutation";
import { withAuth } from "@/lib/with-auth";
import type { SignaturePayload } from "@/lib/types";

export async function fetchAgents() {
  return withAuth(async (wallet) => {
    const client = getForsetyClient();
    const agents = await client.agents.listByOwner(wallet);
    return agents.map((a) => {
      const safe = sanitizeAgent(a);
      return {
        ...safe,
        createdAt: a.createdAt?.toISOString() ?? new Date().toISOString(),
        lastSeenAt: a.lastSeenAt?.toISOString() ?? null,
      };
    });
  }, []).catch((err) => {
    console.error("[fetchAgents]", err);
    Sentry.captureException(err, { extra: { action: "fetchAgents" } });
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
        createdAt: agent.createdAt?.toISOString() ?? new Date().toISOString(),
        lastSeenAt: agent.lastSeenAt?.toISOString() ?? null,
      },
      auditSummary: {
        ...auditSummary,
        recentActions: (auditSummary.recentActions ?? []).map((a) => ({
          ...a,
          timestamp: a.timestamp?.toISOString() ?? new Date().toISOString(),
        })),
      },
    };
  }, null).catch((err) => {
    console.error("[fetchAgentDetail]", err);
    Sentry.captureException(err, { extra: { action: "fetchAgentDetail", agentId: id } });
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
    Sentry.captureException(err, { extra: { action: "fetchAgentAuditLogs", agentId } });
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
    if (!input.allowedDatasets || input.allowedDatasets.length === 0) {
      throw new Error("Dataset scope is required. Select at least one dataset or use wildcard.");
    }

    const result = await client.agents.register({
      name: input.name,
      description: input.description,
      ownerAddress: wallet,
      permissions: input.permissions,
      allowedDatasets: input.allowedDatasets,
    });

    // Fire-and-forget notification
    client.notifications.create({
      recipientAddress: wallet,
      type: "agent_registered",
      title: "Agent Registered",
      message: `New agent "${input.name}" has been registered successfully`,
      relatedResourceType: "agent",
      relatedResourceId: result.agent.id,
    }).catch(() => {});

    return {
      agentId: result.agent.id,
      apiKey: result.apiKey,
    };
  });
}

export async function updateAgentPermissions(
  agentId: string,
  input: { permissions?: string[]; allowedDatasets?: string[] },
  sig: SignaturePayload
) {
  return withSignedMutation(sig, async (wallet, client) => {
    const agent = await client.agents.getById(agentId);
    if (!agent || agent.ownerAddress !== wallet) {
      throw new Error("Agent not found or access denied");
    }

    if (input.allowedDatasets && input.allowedDatasets.length === 0) {
      throw new Error("Dataset scope is required. Select at least one dataset or use wildcard.");
    }

    const updated = await client.agents.updatePermissions(
      agentId,
      input.permissions ?? agent.permissions,
      input.allowedDatasets
    );

    return {
      agent: updated ? {
        ...sanitizeAgent(updated),
        createdAt: updated.createdAt?.toISOString() ?? new Date().toISOString(),
        lastSeenAt: updated.lastSeenAt?.toISOString() ?? null,
      } : null,
    };
  });
}
