"use server";

import * as Sentry from "@sentry/nextjs";
import { getForsetyClient } from "@/lib/forsety";
import { withAuth } from "@/lib/with-auth";

export interface DailyCount {
  date: string;
  count: number;
}

export interface DatasetAnalytics {
  dailyAccess: DailyCount[];
  topAccessors: Array<{ address: string; count: number }>;
  opBreakdown: Record<string, number>;
}

export interface DashboardTrends {
  dailyAccess: DailyCount[];
  dailyAudit: DailyCount[];
}

function toDailyCounts(
  logs: Array<{ timestamp: Date | string }>,
  days: number
): DailyCount[] {
  const now = new Date();
  const buckets = new Map<string, number>();

  // Initialize all days
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    buckets.set(d.toISOString().split("T")[0], 0);
  }

  for (const log of logs) {
    const dateStr = new Date(log.timestamp).toISOString().split("T")[0];
    if (buckets.has(dateStr)) {
      buckets.set(dateStr, (buckets.get(dateStr) ?? 0) + 1);
    }
  }

  return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
}

export async function fetchDatasetAnalytics(datasetId: string): Promise<DatasetAnalytics | null> {
  return withAuth(async (wallet) => {
    const client = getForsetyClient();
    const dataset = await client.datasets.getById(datasetId);
    if (!dataset || dataset.ownerAddress !== wallet) return null;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const logs = await client.access.listByOwner(wallet, {
      datasetId,
      from: thirtyDaysAgo,
    });

    const dailyAccess = toDailyCounts(logs, 30);

    // Top accessors
    const accessorCounts = new Map<string, number>();
    for (const log of logs) {
      const addr = log.accessorAddress;
      accessorCounts.set(addr, (accessorCounts.get(addr) ?? 0) + 1);
    }
    const topAccessors = Array.from(accessorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([address, count]) => ({ address, count }));

    // Operation type breakdown
    const opBreakdown: Record<string, number> = {};
    for (const log of logs) {
      const op = log.operationType;
      opBreakdown[op] = (opBreakdown[op] ?? 0) + 1;
    }

    return { dailyAccess, topAccessors, opBreakdown };
  }, null).catch((err) => {
    Sentry.captureException(err, { extra: { action: "fetchDatasetAnalytics", datasetId } });
    return null;
  });
}

export async function fetchDashboardTrends(): Promise<DashboardTrends | null> {
  return withAuth(async (wallet) => {
    const client = getForsetyClient();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [accessLogs, auditLogs] = await Promise.all([
      client.access.listByOwner(wallet, { from: sevenDaysAgo }),
      client.agentAudit.listByOwner(wallet, { dateFrom: sevenDaysAgo }).catch(() => []),
    ]);

    return {
      dailyAccess: toDailyCounts(accessLogs, 7),
      dailyAudit: toDailyCounts(auditLogs as Array<{ timestamp: Date }>, 7),
    };
  }, null).catch((err) => {
    Sentry.captureException(err, { extra: { action: "fetchDashboardTrends" } });
    return null;
  });
}
