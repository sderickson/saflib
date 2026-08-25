import { baseDbManager } from "../../instances.ts";
import {
  userConfigTable,
  type UserConfigEntity,
} from "../../schemas/user-config.ts";
import type { ReturnsError } from "@saflib/monorepo";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { eq } from "drizzle-orm";

export interface UpsertUserConfigParams {
  userId: (typeof userConfigTable.$inferSelect)["userId"];
  displayName: (typeof userConfigTable.$inferSelect)["displayName"];
  marketingEmailsOptIn: (typeof userConfigTable.$inferSelect)["marketingEmailsOptIn"];
  /**
   * When true, set `termsOfServiceAgreedAt` to now if it is currently null.
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
    const displayName = params.displayName.trim();

    const existing = await db
      .select()
      .from(userConfigTable)
      .where(eq(userConfigTable.userId, params.userId))
      .limit(1);

    let marketingEmailsOptInAt: Date | null;
    if (!params.marketingEmailsOptIn) {
      marketingEmailsOptInAt = null;
    } else if (!existing[0]?.marketingEmailsOptIn) {
      marketingEmailsOptInAt = now;
    } else {
      marketingEmailsOptInAt = existing[0].marketingEmailsOptInAt;
    }

    let termsOfServiceAgreedAt: Date | null =
      existing[0]?.termsOfServiceAgreedAt ?? null;
    if (params.agreeToTermsOfServiceNow && !termsOfServiceAgreedAt) {
      termsOfServiceAgreedAt = now;
    }

    const result = await db
      .insert(userConfigTable)
      .values({
        userId: params.userId,
        displayName,
        marketingEmailsOptIn: params.marketingEmailsOptIn,
        marketingEmailsOptInAt,
        termsOfServiceAgreedAt,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: userConfigTable.userId,
        set: {
          displayName,
          marketingEmailsOptIn: params.marketingEmailsOptIn,
          marketingEmailsOptInAt,
          termsOfServiceAgreedAt,
          updatedAt: now,
        },
      })
      .returning();

    return { result: result[0]! };
  },
);
