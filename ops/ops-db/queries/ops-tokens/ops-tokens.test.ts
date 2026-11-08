import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { throwError } from "@saflib/utils";
import {
  createToken,
  findActiveByHash,
  hashOpsToken,
  listTokens,
  looksLikeOpsToken,
  opsDb,
  OpsTokenAlreadyRevokedError,
  OpsTokenNotFoundError,
  revokeToken,
  touchLastUsed,
} from "../../index.ts";

describe("ops tokens", () => {
  let dbKey: DbKey;
  beforeAll(() => {
    dbKey = opsDb.connect();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates a token, stores only its hash, and finds it by hash", async () => {
    const { token, opsToken } = await throwError(
      createToken(dbKey, {
        name: "agent",
        scopes: ["ops:read", "ops:read", "ops:triage"],
        createdBy: "admin-1",
      }),
    );
    expect(looksLikeOpsToken(token)).toBe(true);
    expect(opsToken.token_hash).toBe(hashOpsToken(token));
    expect(JSON.stringify(opsToken)).not.toContain(token.slice(7));
    expect(token.slice(7, 15)).toBe(opsToken.token_prefix);
    expect(opsToken.scopes).toEqual(["ops:read", "ops:triage"]);

    const found = await throwError(findActiveByHash(dbKey, hashOpsToken(token)));
    expect(found.id).toBe(opsToken.id);
  });

  it("does not find revoked or expired tokens", async () => {
    const revoked = await throwError(
      createToken(dbKey, { name: "r", scopes: ["ops:read"], createdBy: null }),
    );
    await throwError(revokeToken(dbKey, revoked.opsToken.id));
    const { error: revokedError } = await findActiveByHash(
      dbKey,
      hashOpsToken(revoked.token),
    );
    expect(revokedError).toBeInstanceOf(OpsTokenNotFoundError);

    const expired = await throwError(
      createToken(dbKey, {
        name: "e",
        scopes: ["ops:read"],
        createdBy: null,
        expiresAt: new Date(Date.now() - 1000),
      }),
    );
    const { error: expiredError } = await findActiveByHash(
      dbKey,
      hashOpsToken(expired.token),
    );
    expect(expiredError).toBeInstanceOf(OpsTokenNotFoundError);
  });

  it("reports unknown and already-revoked tokens on revoke", async () => {
    const { error: missing } = await revokeToken(dbKey, "nope");
    expect(missing).toBeInstanceOf(OpsTokenNotFoundError);

    const { opsToken } = await throwError(
      createToken(dbKey, { name: "twice", scopes: ["ops:read"], createdBy: null }),
    );
    await throwError(revokeToken(dbKey, opsToken.id));
    const { error: again } = await revokeToken(dbKey, opsToken.id);
    expect(again).toBeInstanceOf(OpsTokenAlreadyRevokedError);
  });

  it("throttles last-used updates to once a minute", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-08T12:00:00Z"));
    const { opsToken } = await throwError(
      createToken(dbKey, { name: "touch", scopes: ["ops:read"], createdBy: null }),
    );
    expect(await throwError(touchLastUsed(dbKey, opsToken.id))).toBe(true);
    vi.setSystemTime(new Date("2026-11-08T12:00:30Z"));
    expect(await throwError(touchLastUsed(dbKey, opsToken.id))).toBe(false);
    vi.setSystemTime(new Date("2026-11-08T12:01:01Z"));
    expect(await throwError(touchLastUsed(dbKey, opsToken.id))).toBe(true);
  });

  it("lists tokens newest first", async () => {
    const tokens = await throwError(listTokens(dbKey));
    expect(tokens.length).toBeGreaterThanOrEqual(4);
    const times = tokens.map((t) => t.created_at.getTime());
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });
});
