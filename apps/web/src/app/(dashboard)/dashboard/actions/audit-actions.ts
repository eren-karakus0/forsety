"use server";

import * as Sentry from "@sentry/nextjs";
import { getForsetyClient } from "@/lib/forsety";
import { withAuth } from "@/lib/with-auth";

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
  return withAuth(async (wallet) => {
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
  }, []).catch((err) => {
    console.error("[fetchAllAuditLogs]", err);
    Sentry.captureException(err, { extra: { action: "fetchAllAuditLogs" } });
    return [];
  });
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
  return withAuth(async (wallet) => {
    const client = getForsetyClient();
    return client.agentAudit.countByOwner(wallet, {
      status: filters?.status,
      agentId: filters?.agentId,
      resourceId: filters?.resourceId,
      dateFrom: filters?.dateFrom ? new Date(filters.dateFrom) : undefined,
      dateTo: filters?.dateTo ? new Date(filters.dateTo) : undefined,
    });
  }, 0).catch((err) => {
    console.error("[countAuditLogs]", err);
    Sentry.captureException(err, { extra: { action: "countAuditLogs" } });
    return 0;
  });
}
