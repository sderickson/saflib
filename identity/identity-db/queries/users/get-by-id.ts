import { queryWrapper } from "@saflib/drizzle-sqlite3";
import { users } from "../../schema.ts";
import { authDbManager } from "../../instances.ts";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import type { User } from "../../types.ts";
import { UserNotFoundError } from "../../errors.ts";
import { eq } from "drizzle-orm";
import type { ReturnsError } from "@saflib/monorepo";

export const getById = queryWrapper(
  async (
    dbKey: DbKey,
    id: number,
  ): Promise<ReturnsError<User, UserNotFoundError>> => {
    const db = authDbManager.get(dbKey)!;
    const result = await db.query.users.findFirst({
      where: eq(users.id, id),
    });
    if (!result) {
      return { error: new UserNotFoundError() };
    }
    return { result };
  },
);
