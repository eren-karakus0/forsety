import { eq, and, desc, gte } from "drizzle-orm";
import type { Database } from "@forsety/db";
import { agentAuditLogs } from "@forsety/db";
import { ForsetyValidationError } from "../errors.js";

export interface LogAuditInput {
  agentId: string;
  action: string;
  toolName?: string;
  resourceType?: string;
  resourceId?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  status?: string;
  errorMessage?: string;
  durationMs?: number;
}

export interface AuditSummary {
  totalActions: number;
  successCount: number;
  deniedCount: number;
  errorCount: number;
  recentActions: Array<{
    action: string;
    status: string;
    timestamp: Date;
  }>;
}

export class AgentAuditService {
  constructor(private db: Database) {}

  async log(input: LogAuditInput) {
    if (!input.agentId || !input.action) {
      throw new ForsetyValidationError("agentId and action are required");
    }

    const [log] = await this.db
      .insert(agentAuditLogs)
      .values({
        agentId: input.agentId,
        action: input.action,
        toolName: input.toolName,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        input: input.input,
        output: input.output,
        status: input.status ?? "success",
        errorMessage: input.errorMessage,
        durationMs: input.durationMs,
      })
      .returning();

    return log!;
  }

  async getByAgent(
    agentId: string,
    filters?: { action?: string; status?: string; limit?: number; offset?: number }
  ) {
    const conditions = [eq(agentAuditLogs.agentId, agentId)];

    if (filters?.action) {
      conditions.push(eq(agentAuditLogs.action, filters.action));
    }
    if (filters?.status) {
      conditions.push(eq(agentAuditLogs.status, filters.status));
    }

    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;

    return this.db
      .select()
      .from(agentAuditLogs)
      .where(and(...conditions))
      .orderBy(desc(agentAuditLogs.timestamp))
      .limit(limit)
      .offset(offset);
  }

  async getByResource(resourceType: string, resourceId: string) {
    return this.db
      .select()
      .from(agentAuditLogs)
      .where(
        and(
          eq(agentAuditLogs.resourceType, resourceType),
          eq(agentAuditLogs.resourceId, resourceId)
        )
      )
      .orderBy(desc(agentAuditLogs.timestamp));
  }

  async getSummary(agentId: string, since?: Date): Promise<AuditSummary> {
    const conditions = [eq(agentAuditLogs.agentId, agentId)];
    if (since) {
      conditions.push(gte(agentAuditLogs.timestamp, since));
    }

    const logs = await this.db
      .select()
      .from(agentAuditLogs)
      .where(and(...conditions))
      .orderBy(desc(agentAuditLogs.timestamp));

    const totalActions = logs.length;
    const successCount = logs.filter((l) => l.status === "success").length;
    const deniedCount = logs.filter((l) => l.status === "denied").length;
    const errorCount = logs.filter((l) => l.status === "error").length;

    const recentActions = logs.slice(0, 10).map((l) => ({
      action: l.action,
      status: l.status,
      timestamp: l.timestamp,
    }));

    return {
      totalActions,
      successCount,
      deniedCount,
      errorCount,
      recentActions,
    };
  }
}
