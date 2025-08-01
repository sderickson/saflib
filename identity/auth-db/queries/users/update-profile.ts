// TODO: Uncomment and fix these imports
import { queryWrapper } from "@saflib/drizzle-sqlite3";
import { users } from "../../schema.ts";
import { authDbManager } from "../../instances.ts";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import type { User, UpdateProfileParams } from "../../types.ts";
import { UserNotFoundError } from "../../errors.ts";
import { eq } from "drizzle-orm";
import type { ReturnsError } from "@saflib/monorepo";

export const updateProfile = queryWrapper(
  async (
    dbKey: DbKey,
    userId: number,
    params: UpdateProfileParams,
  ): Promise<ReturnsError<User, UserNotFoundError>> => {
    const db = authDbManager.get(dbKey)!;
    const result = await db
      .update(users)
      .set(params)
      .where(eq(users.id, userId))
      .returning();

    if (!result.length) {
      return { error: new UserNotFoundError() };
    }
    return { result: result[0] };
  },
);
