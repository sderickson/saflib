import { baseDbManager } from "../../instances.ts";
import { userConfigTable } from "../../schemas/user-config.ts";
import type { ReturnsError } from "@saflib/monorepo";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { eq } from "drizzle-orm";

export interface ClearMarketingEmailsOptInParams {
  userId: (typeof userConfigTable.$inferSelect)["userId"];
}

export type ClearMarketingEmailsOptInError = never;

/**
 * Clears marketing opt-in for an existing `user_config` row.
 * No-ops (no insert) when the user has no row yet — already not opted in.
 */
export const clearMarketingEmailsOptIn = queryWrapper(
  async (
    dbKey: DbKey,
    params: ClearMarketingEmailsOptInParams,
  ): Promise<
    ReturnsError<{ updated: boolean }, ClearMarketingEmailsOptInError>
  > => {
    const db = baseDbManager.get(dbKey)!;
    const now = new Date();

    const result = await db
      .update(userConfigTable)
      .set({
        marketingEmailsOptIn: false,
        marketingEmailsOptInAt: null,
        updatedAt: now,
      })
      .where(eq(userConfigTable.userId, params.userId))
      .returning({ userId: userConfigTable.userId });

    return { result: { updated: result.length > 0 } };
  },
);
