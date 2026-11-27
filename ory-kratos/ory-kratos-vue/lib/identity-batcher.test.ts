import { describe, expect, it, vi } from "vitest";
import { createIdentityBatcher, isKratosId } from "./identity-batcher.ts";

const summary = (id: string) => ({
  id,
  email: `${id}@example.com`,
  name: null,
  org: null,
  role: null,
  verified: true,
  state: "active",
  created_at: "2026-01-01T00:00:00Z",
});

describe("createIdentityBatcher", () => {
  it("fetches ids asked for in the same tick together, once each", async () => {
    const fetchIdentities = vi.fn(async (ids: string[]) =>
      ids.filter((id) => id !== "gone").map(summary),
    );
    const load = createIdentityBatcher(fetchIdentities);
    const results = await Promise.all([load("a"), load("b"), load("a"), load("gone")]);
    expect(fetchIdentities).toHaveBeenCalledTimes(1);
    expect(fetchIdentities).toHaveBeenCalledWith(["a", "b", "gone"]);
    expect(results.map((r) => r?.id ?? null)).toEqual(["a", "b", "a", null]);
  });

  it("rejects every waiter when the request fails", async () => {
    const load = createIdentityBatcher(async () => {
      throw new Error("502");
    });
    await expect(load("a")).rejects.toThrow("502");
  });
});

describe("isKratosId", () => {
  it("accepts uuids only", () => {
    expect(isKratosId("3feea557-9bc0-475f-8130-a51c35fa4c91")).toBe(true);
    expect(isKratosId("system")).toBe(false);
    expect(isKratosId("ops_token:abc")).toBe(false);
  });
});
