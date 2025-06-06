import { queryWrapper } from "@saflib/drizzle-sqlite3";
import { users } from "../../schema.ts";
import type { User } from "../../types.ts";
import { UserNotFoundError } from "../../errors.ts";
import { eq } from "drizzle-orm";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { authDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/monorepo";

export const updateLastLogin = queryWrapper(
  async (
    dbKey: DbKey,
    id: number,
  ): Promise<ReturnsError<User, UserNotFoundError>> => {
    const db = authDbManager.get(dbKey)!;
    const now = new Date();
    const result = await db
      .update(users)
      .set({ lastLoginAt: now })
      .where(eq(users.id, id))
      .returning();

    if (!result.length) {
      return { error: new UserNotFoundError() };
    }
    return { result: result[0] };
  },
);
