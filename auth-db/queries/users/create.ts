import { DbKey, queryWrapper } from "@saflib/drizzle-sqlite3";
import type { SelectUser } from "../../types.ts";
import type { NewUser } from "../../types.ts";
import { authDbManager } from "../../instances.ts";
import { EmailConflictError } from "../../errors.ts";
import { users } from "../../schema.ts";
import type { ReturnsError } from "@saflib/monorepo";

export const create = queryWrapper(
  async (
    dbKey: DbKey,
    user: NewUser,
  ): Promise<ReturnsError<SelectUser, EmailConflictError>> => {
    const db = authDbManager.get(dbKey)!;
    const now = new Date();
    try {
      const result = await db
        .insert(users)
        .values({ ...user, createdAt: now })
        .returning();
      return {
        result: result[0],
      };
    } catch (e: unknown) {
      if (
        e instanceof Error &&
        e.message.includes("UNIQUE constraint failed: users.email")
      ) {
        return {
          error: new EmailConflictError(),
        };
      }
      throw e;
    }
  },
);
