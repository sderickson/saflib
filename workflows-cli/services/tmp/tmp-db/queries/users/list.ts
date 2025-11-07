import { tmpDbManager } from "../../instances.ts";
import { StubError } from "../../errors.ts";
// TODO: import your actual types
import type { StubParams, StubEntity } from "../../types.ts";
import type { ReturnsError } from "@saflib/monorepo";

import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { usersTable } from "../../schemas/users.ts";

export type ListUsersError = StubError;

export const listUsers = queryWrapper(
  async (
    dbKey: DbKey,
    params: StubParams,
  ): Promise<ReturnsError<StubEntity, ListUsersError>> => {
    const db = tmpDbManager.get(dbKey)!;
    // TODO: replace this logic with your actual logic
    // For reference, this is standard "create" logic
    const result = await db
      .insert(usersTable)
      .values({
        ...params,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return {
      result: {
        ...result[0],
      },
    };
  },
);
