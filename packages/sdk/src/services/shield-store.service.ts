import { eq, and } from "drizzle-orm";
import type { Database } from "@forsety/db";
import { encryptionMetadata } from "@forsety/db";
import type { AgentMemory } from "@forsety/db";
import { encrypt, decrypt, isEncryptedPayload } from "../crypto/aes.js";
import type { EncryptedPayload } from "../crypto/aes.js";
import { ForsetyValidationError } from "../errors.js";
import type { StoreMemoryInput } from "./recall-vault.service.js";
import type { RecallVaultService } from "./recall-vault.service.js";

export class ShieldStoreService {
  constructor(
    private db: Database,
    private recallVault: RecallVaultService
  ) {}

  /**
   * Encrypt content and store as a memory in RecallVault.
   * The encryption key never touches the server — it's derived client-side.
   */
  async storeEncrypted(
    input: StoreMemoryInput,
    key: Buffer
  ): Promise<AgentMemory> {
    const contentStr = JSON.stringify(input.content);
    const payload = encrypt(contentStr, key);

    // Store encrypted payload as the memory content
    const encryptedInput: StoreMemoryInput = {
      ...input,
      content: payload as unknown as Record<string, unknown>,
    };

    const memory = await this.recallVault.store(encryptedInput);

    // Record encryption metadata
    await this.db
      .insert(encryptionMetadata)
      .values({
        resourceType: "memory",
        resourceId: memory.id,
        iv: payload.iv,
      })
      .onConflictDoUpdate({
        target: [encryptionMetadata.resourceType, encryptionMetadata.resourceId],
        set: {
          iv: payload.iv,
          createdAt: new Date(),
        },
      });

    return memory;
  }

  /**
   * Retrieve a memory and decrypt if encrypted.
   * Returns null if memory not found.
   * Throws if decryption fails (wrong key).
   */
  async retrieveDecrypted(
    agentId: string,
    namespace: string,
    memoryKey: string,
    key: Buffer
  ): Promise<AgentMemory | null> {
    const memory = await this.recallVault.retrieve(
      agentId,
      namespace,
      memoryKey
    );

    if (!memory) return null;

    // If content is encrypted, decrypt it
    if (isEncryptedPayload(memory.content)) {
      try {
        const decrypted = decrypt(
          memory.content as unknown as EncryptedPayload,
          key
        );
        return {
          ...memory,
          content: JSON.parse(decrypted) as Record<string, unknown>,
        };
      } catch {
        throw new ForsetyValidationError(
          "Decryption failed — wrong key or corrupted data"
        );
      }
    }

    // Unencrypted memory — return as-is (backward compatible)
    return memory;
  }

  /**
   * Check if a memory is encrypted.
   */
  async isEncrypted(memoryId: string): Promise<boolean> {
    const result = await this.db
      .select()
      .from(encryptionMetadata)
      .where(
        and(
          eq(encryptionMetadata.resourceType, "memory"),
          eq(encryptionMetadata.resourceId, memoryId)
        )
      )
      .limit(1);

    return result.length > 0;
  }
}
