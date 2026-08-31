import { baseDbManager } from "#instances.ts";
import {
  userConfigTable,
  type UserConfigEntity,
} from "#schemas/user-config.ts";
import type { ReturnsError } from "@saflib/monorepo";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { eq } from "drizzle-orm";

export interface CreateIfMissingUserConfigParams {
  user_id: (typeof userConfigTable.$inferSelect)["user_id"];
}

export type CreateIfMissingUserConfigError = never;

/**
 * First-GET / registration lazy-create: insert empty defaults when missing.
 * Idempotent — returns the existing row without overwriting.
 */
export const createIfMissingUserConfig = queryWrapper(
  async (
    dbKey: DbKey,
    params: CreateIfMissingUserConfigParams,
  ): Promise<
    ReturnsError<UserConfigEntity, CreateIfMissingUserConfigError>
  > => {
    const db = baseDbManager.get(dbKey)!;
    const now = new Date();

    const inserted = await db
      .insert(userConfigTable)
      .values({
        user_id: params.user_id,
        display_name: "",
        marketing_emails_opt_in: false,
        marketing_emails_opt_in_at: null,
        terms_of_service_agreed_at: null,
        created_at: now,
        updated_at: now,
      })
      .onConflictDoNothing({
        target: userConfigTable.user_id,
      })
      .returning();

    if (inserted[0]) {
      return { result: inserted[0] };
    }

    const existing = await db
      .select()
      .from(userConfigTable)
      .where(eq(userConfigTable.user_id, params.user_id))
      .limit(1);

    return { result: existing[0]! };
  },
);
