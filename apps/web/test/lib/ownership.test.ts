import { describe, it, expect, vi } from "vitest";
import { assertOwnership } from "@/lib/ownership";

describe("assertOwnership", () => {
  const makeClient = (dataset: { ownerAddress: string } | null) => ({
    datasets: { getById: vi.fn().mockResolvedValue(dataset) },
  });

  it("returns dataset when owned by accessor", async () => {
    const dataset = { ownerAddress: "0xABC" };
    const client = makeClient(dataset);
    const result = await assertOwnership(client, "ds-1", "0xABC");
    expect(result).toEqual({ dataset });
    expect(client.datasets.getById).toHaveBeenCalledWith("ds-1");
  });

  it("returns 404 when dataset not found", async () => {
    const client = makeClient(null);
    const result = await assertOwnership(client, "ds-1", "0xABC");
    expect(result.error).toBeDefined();
    expect(result.error!.status).toBe(404);
  });

  it("returns 403 when not owned", async () => {
    const client = makeClient({ ownerAddress: "0xOTHER" });
    const result = await assertOwnership(client, "ds-1", "0xABC");
    expect(result.error).toBeDefined();
    expect(result.error!.status).toBe(403);
  });
});
