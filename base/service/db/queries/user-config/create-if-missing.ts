import { baseDbManager } from "../../instances.ts";
import {
  userConfigTable,
  type UserConfigEntity,
} from "../../schemas/user-config.ts";
import type { ReturnsError } from "@saflib/monorepo";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { eq } from "drizzle-orm";

export interface CreateIfMissingUserConfigParams {
  userId: (typeof userConfigTable.$inferSelect)["userId"];
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
        userId: params.userId,
        displayName: "",
        marketingEmailsOptIn: false,
        marketingEmailsOptInAt: null,
        termsOfServiceAgreedAt: null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({
        target: userConfigTable.userId,
      })
      .returning();

    if (inserted[0]) {
      return { result: inserted[0] };
    }

    const existing = await db
      .select()
      .from(userConfigTable)
      .where(eq(userConfigTable.userId, params.userId))
      .limit(1);

    return { result: existing[0]! };
  },
);
