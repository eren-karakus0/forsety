import { eq, and, desc, gte, lte, isNull, count } from "drizzle-orm";
import type { Database } from "@forsety/db";
import { agentAuditLogs, agents } from "@forsety/db";
import { ForsetyValidationError } from "../errors.js";

export interface LogAuditInput {
  agentId: string | null;
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
    if (!input.action) {
      throw new ForsetyValidationError("action is required");
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

  /** Global count of audit events — efficient SQL COUNT */
  async countAll(): Promise<number> {
    const [result] = await this.db
      .select({ total: count() })
      .from(agentAuditLogs);
    return result?.total ?? 0;
  }

  /** Global audit feed — includes anonymous (null agentId) records */
  async listAll(filters?: {
    agentId?: string | null;
    status?: string;
    resourceType?: string;
    resourceId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }) {
    const conditions = [];

    if (filters?.agentId === null) {
      conditions.push(isNull(agentAuditLogs.agentId));
    } else if (filters?.agentId) {
      conditions.push(eq(agentAuditLogs.agentId, filters.agentId));
    }

    if (filters?.status) {
      conditions.push(eq(agentAuditLogs.status, filters.status));
    }

    if (filters?.resourceType) {
      conditions.push(eq(agentAuditLogs.resourceType, filters.resourceType));
    }

    if (filters?.resourceId) {
      conditions.push(eq(agentAuditLogs.resourceId, filters.resourceId));
    }

    if (filters?.dateFrom) {
      conditions.push(gte(agentAuditLogs.timestamp, filters.dateFrom));
    }

    if (filters?.dateTo) {
      conditions.push(lte(agentAuditLogs.timestamp, filters.dateTo));
    }

    const limit = filters?.limit ?? 100;
    const offset = filters?.offset ?? 0;

    return this.db
      .select()
      .from(agentAuditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(agentAuditLogs.timestamp))
      .limit(limit)
      .offset(offset);
  }

  /** Count filtered audit logs for pagination */
  async countFiltered(filters?: {
    agentId?: string | null;
    status?: string;
    resourceType?: string;
    resourceId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<number> {
    const conditions = [];

    if (filters?.agentId === null) {
      conditions.push(isNull(agentAuditLogs.agentId));
    } else if (filters?.agentId) {
      conditions.push(eq(agentAuditLogs.agentId, filters.agentId));
    }

    if (filters?.status) {
      conditions.push(eq(agentAuditLogs.status, filters.status));
    }

    if (filters?.resourceType) {
      conditions.push(eq(agentAuditLogs.resourceType, filters.resourceType));
    }

    if (filters?.resourceId) {
      conditions.push(eq(agentAuditLogs.resourceId, filters.resourceId));
    }

    if (filters?.dateFrom) {
      conditions.push(gte(agentAuditLogs.timestamp, filters.dateFrom));
    }

    if (filters?.dateTo) {
      conditions.push(lte(agentAuditLogs.timestamp, filters.dateTo));
    }

    const [result] = await this.db
      .select({ total: count() })
      .from(agentAuditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return result?.total ?? 0;
  }

  /** List audit logs scoped to agents owned by ownerAddress. */
  async listByOwner(
    ownerAddress: string,
    filters?: {
      agentId?: string | null;
      status?: string;
      resourceType?: string;
      resourceId?: string;
      dateFrom?: Date;
      dateTo?: Date;
      limit?: number;
      offset?: number;
    }
  ) {
    const conditions = [eq(agents.ownerAddress, ownerAddress)];

    if (filters?.agentId === null) {
      conditions.push(isNull(agentAuditLogs.agentId));
    } else if (filters?.agentId) {
      conditions.push(eq(agentAuditLogs.agentId, filters.agentId));
    }

    if (filters?.status) {
      conditions.push(eq(agentAuditLogs.status, filters.status));
    }

    if (filters?.resourceType) {
      conditions.push(eq(agentAuditLogs.resourceType, filters.resourceType));
    }

    if (filters?.resourceId) {
      conditions.push(eq(agentAuditLogs.resourceId, filters.resourceId));
    }

    if (filters?.dateFrom) {
      conditions.push(gte(agentAuditLogs.timestamp, filters.dateFrom));
    }

    if (filters?.dateTo) {
      conditions.push(lte(agentAuditLogs.timestamp, filters.dateTo));
    }

    const limit = filters?.limit ?? 100;
    const offset = filters?.offset ?? 0;

    return this.db
      .select({
        id: agentAuditLogs.id,
        agentId: agentAuditLogs.agentId,
        action: agentAuditLogs.action,
        toolName: agentAuditLogs.toolName,
        resourceType: agentAuditLogs.resourceType,
        resourceId: agentAuditLogs.resourceId,
        input: agentAuditLogs.input,
        output: agentAuditLogs.output,
        status: agentAuditLogs.status,
        errorMessage: agentAuditLogs.errorMessage,
        durationMs: agentAuditLogs.durationMs,
        timestamp: agentAuditLogs.timestamp,
      })
      .from(agentAuditLogs)
      .innerJoin(agents, eq(agentAuditLogs.agentId, agents.id))
      .where(and(...conditions))
      .orderBy(desc(agentAuditLogs.timestamp))
      .limit(limit)
      .offset(offset);
  }

  /** Count audit logs scoped to agents owned by ownerAddress. */
  async countByOwner(
    ownerAddress: string,
    filters?: {
      status?: string;
    }
  ): Promise<number> {
    const conditions = [eq(agents.ownerAddress, ownerAddress)];

    if (filters?.status) {
      conditions.push(eq(agentAuditLogs.status, filters.status));
    }

    const [result] = await this.db
      .select({ total: count() })
      .from(agentAuditLogs)
      .innerJoin(agents, eq(agentAuditLogs.agentId, agents.id))
      .where(and(...conditions));

    return result?.total ?? 0;
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
