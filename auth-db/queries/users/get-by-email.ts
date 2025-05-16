import { type DbKey, queryWrapper } from "@saflib/drizzle-sqlite3";
import { UserNotFoundError } from "../../errors.ts";
import { users } from "../../schema.ts";
import type { SelectUser } from "../../types.ts";
import { authDbManager } from "../../instances.ts";
import { eq } from "drizzle-orm";
import type { ReturnsError } from "@saflib/monorepo";

export const getByEmail = queryWrapper(
  async (
    dbKey: DbKey,
    email: string,
  ): Promise<ReturnsError<SelectUser, UserNotFoundError>> => {
    const db = authDbManager.get(dbKey)!;
    const result = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (!result) {
      return { error: new UserNotFoundError() };
    }
    return { result };
  },
);
