import { type DbKey, queryWrapper } from "@saflib/drizzle-sqlite3";
import { UserNotFoundError } from "../../errors.ts";
import { users } from "../../schema.ts";
import type { User } from "../../types.ts";
import { identityDbManager } from "../../instances.ts";
import { eq } from "drizzle-orm";
import type { ReturnsError } from "@saflib/monorepo";

export const getByEmail = queryWrapper(
  async (
    dbKey: DbKey,
    email: string,
  ): Promise<ReturnsError<User, UserNotFoundError>> => {
    const db = identityDbManager.get(dbKey)!;
    const result = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (!result) {
      return { error: new UserNotFoundError() };
    }
    return { result };
  },
);
