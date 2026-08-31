import { baseDbManager } from "#instances.ts";
import {
  userConfigTable,
  type UserConfigEntity,
} from "#schemas/user-config.ts";
import type { ReturnsError } from "@saflib/monorepo";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { eq } from "drizzle-orm";

export interface UpsertUserConfigParams {
  user_id: (typeof userConfigTable.$inferSelect)["user_id"];
  display_name: (typeof userConfigTable.$inferSelect)["display_name"];
  marketing_emails_opt_in: (typeof userConfigTable.$inferSelect)["marketing_emails_opt_in"];
  /**
   * When true, set `terms_of_service_agreed_at` to now if it is currently null.
   * Does not overwrite an existing agreement timestamp.
   */
  agreeToTermsOfServiceNow?: boolean;
}

export type UpsertUserConfigError = never;

export const upsertUserConfig = queryWrapper(
  async (
    dbKey: DbKey,
    params: UpsertUserConfigParams,
  ): Promise<ReturnsError<UserConfigEntity, UpsertUserConfigError>> => {
    const db = baseDbManager.get(dbKey)!;
    const now = new Date();
    const display_name = params.display_name.trim();

    const existing = await db
      .select()
      .from(userConfigTable)
      .where(eq(userConfigTable.user_id, params.user_id))
      .limit(1);

    let marketing_emails_opt_in_at: Date | null;
    if (!params.marketing_emails_opt_in) {
      marketing_emails_opt_in_at = null;
    } else if (!existing[0]?.marketing_emails_opt_in) {
      marketing_emails_opt_in_at = now;
    } else {
      marketing_emails_opt_in_at = existing[0].marketing_emails_opt_in_at;
    }

    let terms_of_service_agreed_at: Date | null =
      existing[0]?.terms_of_service_agreed_at ?? null;
    if (params.agreeToTermsOfServiceNow && !terms_of_service_agreed_at) {
      terms_of_service_agreed_at = now;
    }

    const result = await db
      .insert(userConfigTable)
      .values({
        user_id: params.user_id,
        display_name,
        marketing_emails_opt_in: params.marketing_emails_opt_in,
        marketing_emails_opt_in_at,
        terms_of_service_agreed_at,
        created_at: now,
        updated_at: now,
      })
      .onConflictDoUpdate({
        target: userConfigTable.user_id,
        set: {
          display_name,
          marketing_emails_opt_in: params.marketing_emails_opt_in,
          marketing_emails_opt_in_at,
          terms_of_service_agreed_at,
          updated_at: now,
        },
      })
      .returning();

    return { result: result[0]! };
  },
);
