import type { Agent } from "@forsety/db";
import { PERMISSIONS, type ToolName } from "../types.js";

export class PolicyCheckMiddleware {
  checkPermission(agent: Agent, toolName: string): { allowed: boolean; reason: string } {
    const requiredPermission = PERMISSIONS[toolName as ToolName];
    if (!requiredPermission) {
      return { allowed: false, reason: `Unknown tool: ${toolName}` };
    }

    if (!agent.permissions.includes(requiredPermission)) {
      return {
        allowed: false,
        reason: `Agent lacks permission: ${requiredPermission}`,
      };
    }

    return { allowed: true, reason: "ok" };
  }

  checkDatasetAccess(agent: Agent, datasetId: string): { allowed: boolean; reason: string } {
    if (agent.allowedDatasets.includes("*")) {
      return { allowed: true, reason: "ok" };
    }

    if (agent.allowedDatasets.includes(datasetId)) {
      return { allowed: true, reason: "ok" };
    }

    return {
      allowed: false,
      reason: `Agent does not have access to dataset: ${datasetId}`,
    };
  }
}
