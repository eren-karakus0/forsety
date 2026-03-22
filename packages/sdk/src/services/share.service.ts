import { eq, and, gt } from "drizzle-orm";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Database } from "@forsety/db";
import { sharedEvidenceLinks, evidencePacks } from "@forsety/db";
import { ForsetyValidationError } from "../errors.js";
import type { AgentAuditService } from "./agent-audit.service.js";

export interface CreateShareLinkInput {
  evidencePackId: string;
  mode: "full" | "redacted";
  ttlHours: number;
  createdBy?: string;
}

export class ShareService {
  constructor(
    private db: Database,
    private hmacSecret: string,
    private auditService?: AgentAuditService
  ) {}

  async createShareLink(input: CreateShareLinkInput) {
    if (!input.evidencePackId || !input.mode) {
      throw new ForsetyValidationError("evidencePackId and mode are required");
    }

    if (typeof input.ttlHours !== "number" || !Number.isInteger(input.ttlHours) || input.ttlHours < 1 || input.ttlHours > 720) {
      throw new ForsetyValidationError("ttlHours must be an integer between 1 and 720");
    }

    // Verify evidence pack exists
    const [pack] = await this.db
      .select()
      .from(evidencePacks)
      .where(eq(evidencePacks.id, input.evidencePackId))
      .limit(1);

    if (!pack) {
      throw new ForsetyValidationError("Evidence pack not found");
    }

    const expiresAt = new Date(Date.now() + input.ttlHours * 60 * 60 * 1000);
    const derivation = `${input.evidencePackId}:${expiresAt.toISOString()}:${input.mode}:${randomBytes(16).toString("hex")}`;
    const token = createHmac("sha256", this.hmacSecret)
      .update(derivation)
      .digest("hex");

    const [link] = await this.db
      .insert(sharedEvidenceLinks)
      .values({
        evidencePackId: input.evidencePackId,
        token,
        mode: input.mode,
        expiresAt,
        createdBy: input.createdBy,
      })
      .returning();

    try {
      await this.auditService?.log({
        agentId: null,
        action: "share_link_created",
        resourceType: "evidence_pack",
        resourceId: input.evidencePackId,
        status: "success",
        output: { mode: input.mode, ttlHours: input.ttlHours },
      });
    } catch { /* audit failure must not break share flow */ }

    return link!;
  }

  async resolveShareLink(token: string) {
    // Reject non-hex or wrong-length tokens before hitting DB
    if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;

    const [link] = await this.db
      .select()
      .from(sharedEvidenceLinks)
      .where(
        and(
          eq(sharedEvidenceLinks.token, token),
          gt(sharedEvidenceLinks.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!link) return null;

    // Constant-time token comparison (defense against timing attacks)
    const tokenBuf = Buffer.from(token, "hex");
    const dbTokenBuf = Buffer.from(link.token, "hex");
    if (tokenBuf.length !== dbTokenBuf.length || !timingSafeEqual(tokenBuf, dbTokenBuf)) {
      return null;
    }

    const [pack] = await this.db
      .select()
      .from(evidencePacks)
      .where(eq(evidencePacks.id, link.evidencePackId))
      .limit(1);

    if (!pack) return null;

    const packData = link.mode === "redacted"
      ? this.redactPack(pack.packJson as Record<string, unknown>)
      : pack.packJson;

    try {
      await this.auditService?.log({
        agentId: null,
        action: "share_link_resolved",
        resourceType: "evidence_pack",
        resourceId: link.evidencePackId,
        status: "success",
      });
    } catch { /* audit failure must not break share flow */ }

    // In redacted mode, strip packJsonCanonical to prevent leaking full data
    const packCanonical = link.mode === "redacted" ? null : pack.packJsonCanonical;

    return {
      link,
      pack: {
        ...pack,
        packJson: packData,
        packJsonCanonical: packCanonical,
      },
    };
  }

  private redactPack(packJson: Record<string, unknown>): Record<string, unknown> {
    const redacted = JSON.parse(JSON.stringify(packJson));

    // Truncate wallet addresses in dataset
    if (redacted.dataset?.ownerAddress) {
      const addr = redacted.dataset.ownerAddress as string;
      redacted.dataset.ownerAddress = addr.slice(0, 6) + "..." + addr.slice(-4);
    }

    // Truncate accessor addresses in access log
    if (Array.isArray(redacted.accessLog)) {
      redacted.accessLog = redacted.accessLog.map((entry: Record<string, unknown>) => ({
        ...entry,
        accessorAddress: typeof entry.accessorAddress === "string"
          ? entry.accessorAddress.slice(0, 6) + "..." + entry.accessorAddress.slice(-4)
          : entry.accessorAddress,
      }));
    }

    // Truncate addresses in policies
    if (Array.isArray(redacted.policies)) {
      redacted.policies = redacted.policies.map((pol: Record<string, unknown>) => ({
        ...pol,
        allowedAccessors: Array.isArray(pol.allowedAccessors)
          ? (pol.allowedAccessors as string[]).map((a: string) =>
              a === "*" ? "*" : a.slice(0, 6) + "..." + a.slice(-4)
            )
          : pol.allowedAccessors,
      }));
    }

    // Truncate grantor addresses in licenses
    if (Array.isArray(redacted.licenses)) {
      redacted.licenses = redacted.licenses.map((lic: Record<string, unknown>) => ({
        ...lic,
        grantorAddress: typeof lic.grantorAddress === "string"
          ? lic.grantorAddress.slice(0, 6) + "..." + lic.grantorAddress.slice(-4)
          : lic.grantorAddress,
      }));
    }

    return redacted;
  }
}
