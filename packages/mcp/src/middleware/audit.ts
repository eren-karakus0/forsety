import type { AgentAuditService } from "@forsety/sdk";

export class AuditMiddleware {
  constructor(private auditService: AgentAuditService) {}

  async logToolCall(params: {
    agentId: string;
    toolName: string;
    input: Record<string, unknown>;
    output: Record<string, unknown>;
    status: "success" | "denied" | "error";
    errorMessage?: string;
    durationMs: number;
    resourceType?: string;
    resourceId?: string;
  }) {
    await this.auditService.log({
      agentId: params.agentId,
      action: `tool.${params.toolName}`,
      toolName: params.toolName,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      input: params.input,
      output: params.output,
      status: params.status,
      errorMessage: params.errorMessage,
      durationMs: params.durationMs,
    });
  }
}
