import { randomBytes } from "node:crypto";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/utils";
import { and, desc, eq, isNull } from "drizzle-orm";
import { opsDbManager } from "../../instances.ts";
import { opsGraphKeys, type OpsGraphKey } from "../../schema.ts";

/** The newest active signing key, creating one if there is none. */
export const getOrCreateSigningKey = queryWrapper(
  async (dbKey: DbKey): Promise<ReturnsError<OpsGraphKey, never>> => {
    const db = opsDbManager.get(dbKey)!;
    const existing = await db.query.opsGraphKeys.findFirst({
      where: isNull(opsGraphKeys.revoked_at),
      orderBy: [desc(opsGraphKeys.created_at)],
    });
    if (existing) return { result: existing };
    const [row] = await db
      .insert(opsGraphKeys)
      .values({
        id: randomBytes(6).toString("base64url"),
        secret: randomBytes(32).toString("base64url"),
        created_at: new Date(),
      })
      .returning();
    return { result: row! };
  },
);

/** An active key by id, for verifying a link; undefined if unknown or revoked. */
export const findActiveGraphKey = queryWrapper(
  async (dbKey: DbKey, id: string): Promise<ReturnsError<OpsGraphKey | undefined, never>> => {
    const db = opsDbManager.get(dbKey)!;
    const row = await db.query.opsGraphKeys.findFirst({
      where: and(eq(opsGraphKeys.id, id), isNull(opsGraphKeys.revoked_at)),
    });
    return { result: row };
  },
);

/** Revoke a key: every link it signed stops rendering. */
export const revokeGraphKey = queryWrapper(
  async (dbKey: DbKey, id: string): Promise<ReturnsError<boolean, never>> => {
    const db = opsDbManager.get(dbKey)!;
    const rows = await db
      .update(opsGraphKeys)
      .set({ revoked_at: new Date() })
      .where(and(eq(opsGraphKeys.id, id), isNull(opsGraphKeys.revoked_at)))
      .returning();
    return { result: rows.length > 0 };
  },
);
