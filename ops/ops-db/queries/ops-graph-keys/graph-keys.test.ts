import { describe, expect, it } from "vitest";
import { throwError } from "@saflib/utils";
import { findActiveGraphKey, getOrCreateSigningKey, opsDb, revokeGraphKey } from "../../index.ts";

describe("graph keys", () => {
  it("creates a key on first use, reuses it, and rotates on revoke", async () => {
    const dbKey = opsDb.connect();
    const first = await throwError(getOrCreateSigningKey(dbKey));
    expect(first.secret.length).toBeGreaterThanOrEqual(43);
    expect((await throwError(getOrCreateSigningKey(dbKey))).id).toBe(first.id);
    expect((await throwError(findActiveGraphKey(dbKey, first.id)))?.id).toBe(first.id);

    expect(await throwError(revokeGraphKey(dbKey, first.id))).toBe(true);
    expect(await throwError(findActiveGraphKey(dbKey, first.id))).toBeUndefined();
    const next = await throwError(getOrCreateSigningKey(dbKey));
    expect(next.id).not.toBe(first.id);
  });
});
