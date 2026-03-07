import type { AgentService } from "@forsety/sdk";
import type { Agent } from "@forsety/db";

export class AuthMiddleware {
  constructor(private agentService: AgentService) {}

  async authenticate(apiKey: string): Promise<Agent | null> {
    if (!apiKey) return null;

    const agent = await this.agentService.authenticate(apiKey);
    if (!agent) return null;

    // Update last seen timestamp (fire-and-forget)
    this.agentService.touchLastSeen(agent.id).catch(() => {});

    return agent;
  }
}
