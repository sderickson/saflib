import { mainDbManager } from "../../instances.ts";
import {
  UserEmailAlreadyExistsError,
  InvalidUserDataError,
} from "../../errors.ts";
import type { User, InsertUserParams } from "../../types.ts";
import type { ReturnsError } from "@saflib/monorepo";

import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { usersTable } from "../../schema.ts";

export type CreateError = UserEmailAlreadyExistsError | InvalidUserDataError;

export const create = queryWrapper(
  async (
    dbKey: DbKey,
    params: InsertUserParams
  ): Promise<ReturnsError<User, CreateError>> => {
    const db = mainDbManager.get(dbKey);
    if (!db) {
      throw new Error("Database connection not found");
    }

    // Validate input
    if (!params.email || !params.name) {
      return { error: new InvalidUserDataError() };
    }

    try {
      const result = await db
        .insert(usersTable)
        .values({
          email: params.email,
          name: params.name,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return { result: result[0] };
    } catch (error) {
      // Check if it's a unique constraint violation
      if (
        error instanceof Error &&
        error.message.includes("UNIQUE constraint failed")
      ) {
        return { error: new UserEmailAlreadyExistsError() };
      }
      throw error;
    }
  }
);
