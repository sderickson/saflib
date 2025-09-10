import { mainDbManager } from "../../instances.ts";
import { UserNotFoundError } from "../../errors.ts";
import type { User } from "../../types.ts";
import type { ReturnsError } from "@saflib/monorepo";

import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { eq } from "drizzle-orm";
import { usersTable } from "../../schema.ts";

export type GetByIdError = UserNotFoundError;

export const getById = queryWrapper(
  async (
    dbKey: DbKey,
    params: { id: number }
  ): Promise<ReturnsError<User, GetByIdError>> => {
    const db = mainDbManager.get(dbKey);

    const result = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, params.id))
      .limit(1);

    if (result.length === 0) {
      return { error: new UserNotFoundError() };
    }

    return { result: result[0] };
  }
);
