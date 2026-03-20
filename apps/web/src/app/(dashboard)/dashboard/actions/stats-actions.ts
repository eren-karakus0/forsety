"use server";

import { getForsetyClient } from "@/lib/forsety";
import { withAuth } from "@/lib/with-auth";

export async function fetchDashboardStats() {
  return withAuth(async (wallet) => {
    const client = getForsetyClient();
    const [datasetCount, agents] = await Promise.all([
      client.datasets.countByOwner(wallet),
      client.agents.listByOwner(wallet),
    ]);

    const activeAgents = agents.filter((a) => a.isActive).length;

    return {
      totalDatasets: datasetCount,
      registeredAgents: agents.length,
      activeAgents,
    };
  }, { totalDatasets: 0, registeredAgents: 0, activeAgents: 0 }).catch((err) => {
    console.error("[fetchDashboardStats]", err);
    return { totalDatasets: 0, registeredAgents: 0, activeAgents: 0 };
  });
}

export async function fetchViolationCount() {
  return withAuth(async (wallet) => {
    const client = getForsetyClient();
    return client.agentAudit.countByOwner(wallet, { status: "denied" });
  }, 0).catch((err) => {
    console.error("[fetchViolationCount]", err);
    return 0;
  });
}
