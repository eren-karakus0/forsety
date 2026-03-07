import type { AgentAuditService } from "@forsety/sdk";

const REDACTED = "[REDACTED]";

/** Sensitive fields that should never appear in audit logs */
const SENSITIVE_INPUT_KEYS = new Set(["content", "apiKey", "password", "secret"]);
const SENSITIVE_OUTPUT_KEYS = new Set(["content", "memories", "contentHash"]);

/** Strip sensitive data from audit payloads before DB write */
function redactPayload(
  data: Record<string, unknown>,
  sensitiveKeys: Set<string>
): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (sensitiveKeys.has(key)) {
      redacted[key] = REDACTED;
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      redacted[key] = redactPayload(value as Record<string, unknown>, sensitiveKeys);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

export class AuditMiddleware {
  constructor(private auditService: AgentAuditService) {}

  async logToolCall(params: {
    agentId: string | null;
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
      input: redactPayload(params.input, SENSITIVE_INPUT_KEYS),
      output: redactPayload(params.output, SENSITIVE_OUTPUT_KEYS),
      status: params.status,
      errorMessage: params.errorMessage,
      durationMs: params.durationMs,
    });
  }
}
