import { type DbKey, queryWrapper } from "@saflib/drizzle";
import type { User } from "../../types.ts";
import type { NewUser } from "../../types.ts";
import { identityDbManager } from "../../instances.ts";
import { EmailConflictError } from "../../errors.ts";
import { users } from "../../schemas/index.ts";
import type { ReturnsError } from "@saflib/monorepo";

export const create = queryWrapper(
  async (
    dbKey: DbKey,
    user: NewUser,
  ): Promise<ReturnsError<User, EmailConflictError>> => {
    const db = identityDbManager.get(dbKey)!;
    const now = new Date();
    try {
      const result = await db
        .insert(users)
        .values({ ...user, createdAt: now, lastLoginAt: now })
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
