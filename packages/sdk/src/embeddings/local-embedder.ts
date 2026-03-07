/**
 * Local embedding using @huggingface/transformers (ONNX Runtime)
 * Model: all-MiniLM-L6-v2 (384 dimensions)
 * No external API needed — runs entirely in Node.js
 */

export interface Embedder {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

export class LocalEmbedder implements Embedder {
  private initPromise: Promise<void> | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractor: any = null;

  private async initialize(): Promise<void> {
    if (this.extractor) return;
    if (this.initPromise) {
      await this.initPromise;
      return;
    }

    this.initPromise = (async () => {
      const { pipeline } = await import("@huggingface/transformers");
      this.extractor = await pipeline(
        "feature-extraction",
        "Xenova/all-MiniLM-L6-v2",
        { dtype: "fp32" }
      );
    })();

    await this.initPromise;
  }

  async embed(text: string): Promise<number[]> {
    await this.initialize();
    const output = await this.extractor(text, {
      pooling: "mean",
      normalize: true,
    });
    return Array.from(output.data as Float32Array);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    await this.initialize();
    const results: number[][] = [];
    for (const text of texts) {
      results.push(await this.embed(text));
    }
    return results;
  }
}
