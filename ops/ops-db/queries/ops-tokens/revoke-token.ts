import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/utils";
import { and, eq, isNull } from "drizzle-orm";
import { opsDbManager } from "../../instances.ts";
import { opsTokens, type OpsToken } from "../../schema.ts";
import {
  OpsTokenAlreadyRevokedError,
  OpsTokenNotFoundError,
} from "../../errors.ts";

export type RevokeTokenResult = ReturnsError<
  OpsToken,
  OpsTokenNotFoundError | OpsTokenAlreadyRevokedError
>;

/**
 * Revoke a token by id, and any still-active tokens exchanged from it.
 * Revocation is permanent.
 */
export const revokeToken = queryWrapper(
  async (dbKey: DbKey, id: string): Promise<RevokeTokenResult> => {
    const db = opsDbManager.get(dbKey)!;
    const existing = await db.query.opsTokens.findFirst({
      where: eq(opsTokens.id, id),
    });
    if (!existing) {
      return { error: new OpsTokenNotFoundError(id) };
    }
    if (existing.revoked_at) {
      return { error: new OpsTokenAlreadyRevokedError(id) };
    }
    const now = new Date();
    const [row] = await db
      .update(opsTokens)
      .set({ revoked_at: now })
      .where(eq(opsTokens.id, id))
      .returning();
    await db
      .update(opsTokens)
      .set({ revoked_at: now })
      .where(and(eq(opsTokens.exchanged_from, id), isNull(opsTokens.revoked_at)));
    return { result: row! };
  },
);
