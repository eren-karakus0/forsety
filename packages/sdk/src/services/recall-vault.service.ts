import { eq, and, ilike, sql, desc, isNotNull, lte } from "drizzle-orm";
import { createHash } from "node:crypto";
import type { Database } from "@forsety/db";
import { agentMemories } from "@forsety/db";
import type { ShelbyWrapper } from "../shelby/client.js";
import type { VectorSearchService } from "./vector-search.service.js";
import { ForsetyValidationError } from "../errors.js";
import { canonicalHash } from "../crypto/canonical-hash.js";

export interface StoreMemoryInput {
  agentId: string;
  namespace?: string;
  key: string;
  content: Record<string, unknown>;
  contentType?: string;
  tags?: string[];
  ttlSeconds?: number;
}

export interface SearchMemoryQuery {
  namespace?: string;
  tags?: string[];
  keyPattern?: string;
  limit?: number;
  offset?: number;
}

function computeContentHash(content: Record<string, unknown>): string {
  return canonicalHash(content);
}

function escapeIlike(pattern: string): string {
  return pattern.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

export class RecallVaultService {
  constructor(
    private db: Database,
    private shelby?: ShelbyWrapper,
    private vectorSearch?: VectorSearchService | (() => VectorSearchService)
  ) {}

  private resolveVectorSearch(): VectorSearchService | undefined {
    if (typeof this.vectorSearch === "function") return this.vectorSearch();
    return this.vectorSearch;
  }

  async store(input: StoreMemoryInput) {
    if (!input.agentId || !input.key) {
      throw new ForsetyValidationError("agentId and key are required");
    }

    const namespace = input.namespace ?? "default";
    const contentHash = computeContentHash(input.content);
    const contentStr = JSON.stringify(input.content);
    const sizeBytes = Buffer.byteLength(contentStr, "utf-8");

    let expiresAt: Date | undefined;
    if (input.ttlSeconds) {
      expiresAt = new Date(Date.now() + input.ttlSeconds * 1000);
    }

    // Atomic upsert via unique constraint on (agentId, namespace, key)
    const [memory] = await this.db
      .insert(agentMemories)
      .values({
        agentId: input.agentId,
        namespace,
        key: input.key,
        content: input.content,
        contentHash,
        contentType: input.contentType ?? "json",
        sizeBytes,
        tags: input.tags ?? [],
        ttlSeconds: input.ttlSeconds,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: [agentMemories.agentId, agentMemories.namespace, agentMemories.key],
        set: {
          content: input.content,
          contentHash,
          contentType: input.contentType ?? "json",
          sizeBytes,
          tags: input.tags ?? [],
          ttlSeconds: input.ttlSeconds,
          expiresAt,
          updatedAt: new Date(),
        },
      })
      .returning();

    // Fire-and-forget: auto-embed for vector search
    this.resolveVectorSearch()?.embedMemory(memory!.id).catch((err) => {
      console.error(`[forsety] auto-embed memory ${memory!.id} failed:`, err);
    });

    return memory!;
  }

  async retrieve(agentId: string, namespace: string, key: string) {
    const result = await this.db
      .select()
      .from(agentMemories)
      .where(
        and(
          eq(agentMemories.agentId, agentId),
          eq(agentMemories.namespace, namespace),
          eq(agentMemories.key, key)
        )
      )
      .limit(1);

    const memory = result[0] ?? null;

    // Check TTL expiration
    if (memory?.expiresAt && new Date() > memory.expiresAt) {
      await this.db
        .delete(agentMemories)
        .where(eq(agentMemories.id, memory.id));
      return null;
    }

    return memory;
  }

  async search(agentId: string, query: SearchMemoryQuery) {
    const conditions = [eq(agentMemories.agentId, agentId)];

    if (query.namespace) {
      conditions.push(eq(agentMemories.namespace, query.namespace));
    }

    if (query.keyPattern) {
      conditions.push(ilike(agentMemories.key, `%${escapeIlike(query.keyPattern)}%`));
    }

    if (query.tags?.length) {
      // Match any of the provided tags using SQL overlap operator
      conditions.push(
        sql`${agentMemories.tags} && ARRAY[${sql.join(
          query.tags.map((t) => sql`${t}`),
          sql`, `
        )}]::text[]`
      );
    }

    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    // Filter expired memories at DB level
    conditions.push(
      sql`(${agentMemories.expiresAt} IS NULL OR ${agentMemories.expiresAt} > NOW())`
    );

    const whereClause = and(...conditions);

    const [items, countResult] = await Promise.all([
      this.db
        .select()
        .from(agentMemories)
        .where(whereClause)
        .orderBy(desc(agentMemories.updatedAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: sql<number>`count(*)::int` })
        .from(agentMemories)
        .where(whereClause),
    ]);

    return { items, total: countResult[0]?.total ?? items.length };
  }

  async delete(agentId: string, memoryId: string) {
    const result = await this.db
      .delete(agentMemories)
      .where(
        and(
          eq(agentMemories.id, memoryId),
          eq(agentMemories.agentId, agentId)
        )
      )
      .returning();

    return result.length > 0;
  }

  async list(
    agentId: string,
    options?: { namespace?: string; limit?: number; offset?: number }
  ) {
    const conditions = [eq(agentMemories.agentId, agentId)];

    if (options?.namespace) {
      conditions.push(eq(agentMemories.namespace, options.namespace));
    }

    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const whereClause = and(...conditions);

    const [items, countResult] = await Promise.all([
      this.db
        .select()
        .from(agentMemories)
        .where(whereClause)
        .orderBy(desc(agentMemories.updatedAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: sql<number>`count(*)::int` })
        .from(agentMemories)
        .where(whereClause),
    ]);

    return { items, total: countResult[0]?.total ?? items.length };
  }

  async exportSnapshot(agentId: string, namespace?: string) {
    const conditions = [eq(agentMemories.agentId, agentId)];
    if (namespace) {
      conditions.push(eq(agentMemories.namespace, namespace));
    }

    const memories = await this.db
      .select()
      .from(agentMemories)
      .where(and(...conditions))
      .orderBy(agentMemories.key);

    const json = {
      agentId,
      namespace: namespace ?? "all",
      exportedAt: new Date().toISOString(),
      memories,
    };

    const hash = createHash("sha256")
      .update(JSON.stringify(json))
      .digest("hex");

    return { json, hash };
  }

  async backupToShelby(memoryId: string) {
    if (!this.shelby) {
      throw new ForsetyValidationError(
        "Shelby wrapper not configured for backup"
      );
    }

    const result = await this.db
      .select()
      .from(agentMemories)
      .where(eq(agentMemories.id, memoryId))
      .limit(1);

    const memory = result[0];
    if (!memory) {
      throw new ForsetyValidationError(`Memory ${memoryId} not found`);
    }

    const _blobName = `memories/${memory.agentId}/${memory.namespace}/${memory.key}.json`;
    const shelbyBlobId = `shelby-${memory.contentHash.slice(0, 16)}`;

    const [updated] = await this.db
      .update(agentMemories)
      .set({ shelbyBlobId })
      .where(eq(agentMemories.id, memoryId))
      .returning();

    return { shelbyBlobId: updated!.shelbyBlobId! };
  }

  /** Remove all memories with expired TTL. Returns count of deleted records. */
  async cleanupExpired(): Promise<number> {
    const result = await this.db
      .delete(agentMemories)
      .where(
        and(
          isNotNull(agentMemories.expiresAt),
          lte(agentMemories.expiresAt, new Date())
        )
      )
      .returning({ id: agentMemories.id });
    return result.length;
  }
}
