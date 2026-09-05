import { baseDbManager } from "#instances.ts";
import { userConfigTable } from "#schemas/user-config.ts";
import type { ReturnsError } from "@saflib/utils";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { eq } from "drizzle-orm";

export interface ClearMarketingEmailsOptInParams {
  user_id: (typeof userConfigTable.$inferSelect)["user_id"];
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
        marketing_emails_opt_in: false,
        marketing_emails_opt_in_at: null,
        updated_at: now,
      })
      .where(eq(userConfigTable.user_id, params.user_id))
      .returning({ user_id: userConfigTable.user_id });

    return { result: { updated: result.length > 0 } };
  },
);
