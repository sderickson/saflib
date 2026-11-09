import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/utils";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { opsDbManager } from "../../instances.ts";
import { opsTokens, type OpsToken } from "../../schema.ts";
import { OpsTokenNotFoundError } from "../../errors.ts";

export type FindActiveByHashResult = ReturnsError<OpsToken, OpsTokenNotFoundError>;

/** The token with this hash, if it is neither revoked nor expired. */
export const findActiveByHash = queryWrapper(
  async (dbKey: DbKey, tokenHash: string): Promise<FindActiveByHashResult> => {
    const db = opsDbManager.get(dbKey)!;
    const now = new Date();
    const row = await db.query.opsTokens.findFirst({
      where: and(
        eq(opsTokens.token_hash, tokenHash),
        isNull(opsTokens.revoked_at),
        or(isNull(opsTokens.expires_at), gt(opsTokens.expires_at, now)),
      ),
    });
    if (!row) {
      return { error: new OpsTokenNotFoundError("No active ops token") };
    }
    return { result: row };
  },
);
