import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/utils";
import { desc } from "drizzle-orm";
import { opsDbManager } from "../../instances.ts";
import { opsTokens, type OpsToken } from "../../schema.ts";

export type ListTokensResult = ReturnsError<OpsToken[], never>;

/** Every token, newest first, including revoked and expired ones. */
export const listTokens = queryWrapper(
  async (dbKey: DbKey): Promise<ListTokensResult> => {
    const db = opsDbManager.get(dbKey)!;
    const rows = await db.query.opsTokens.findMany({
      orderBy: [desc(opsTokens.created_at)],
    });
    return { result: rows };
  },
);
