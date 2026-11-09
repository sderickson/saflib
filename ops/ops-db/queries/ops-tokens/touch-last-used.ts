import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/utils";
import { and, eq, isNull, lt, or } from "drizzle-orm";
import { opsDbManager } from "../../instances.ts";
import { opsTokens } from "../../schema.ts";

/** Writes at most once per this many ms per token, to keep reads cheap. */
export const LAST_USED_RESOLUTION_MS = 60_000;

/** `true` when the row was updated, `false` when it was recent enough already. */
export type TouchLastUsedResult = ReturnsError<boolean, never>;

/** Record that a token was used, throttled to {@link LAST_USED_RESOLUTION_MS}. */
export const touchLastUsed = queryWrapper(
  async (dbKey: DbKey, id: string): Promise<TouchLastUsedResult> => {
    const db = opsDbManager.get(dbKey)!;
    const now = new Date();
    const staleBefore = new Date(now.getTime() - LAST_USED_RESOLUTION_MS);
    const rows = await db
      .update(opsTokens)
      .set({ last_used_at: now })
      .where(
        and(
          eq(opsTokens.id, id),
          or(isNull(opsTokens.last_used_at), lt(opsTokens.last_used_at, staleBefore)),
        ),
      )
      .returning({ id: opsTokens.id });
    return { result: rows.length > 0 };
  },
);
