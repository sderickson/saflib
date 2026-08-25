import { baseDbManager } from "../../instances.ts";
import {
  userConfigTable,
  type UserConfigEntity,
} from "../../schemas/user-config.ts";
import type { ReturnsError } from "@saflib/monorepo";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { eq } from "drizzle-orm";

export interface GetByUserIdUserConfigParams {
  userId: (typeof userConfigTable.$inferSelect)["userId"];
}

export type GetByUserIdUserConfigError = never;

export const getByUserIdUserConfig = queryWrapper(
  async (
    dbKey: DbKey,
    params: GetByUserIdUserConfigParams,
  ): Promise<
    ReturnsError<UserConfigEntity | null, GetByUserIdUserConfigError>
  > => {
    const db = baseDbManager.get(dbKey)!;

    const result = await db
      .select()
      .from(userConfigTable)
      .where(eq(userConfigTable.userId, params.userId))
      .limit(1);

    return { result: result[0] ?? null };
  },
);
