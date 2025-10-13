import { __serviceName__DbManager } from "../../instances.ts";
import { StubError } from "../../errors.ts";
// TODO: import your actual types
import type { StubParams, StubEntity } from "../../types.ts";
import type { ReturnsError } from "@saflib/monorepo";

import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { __groupName__Table } from "../../schemas/__group-name__.ts";

export type __TargetName____GroupName__Error = StubError;

export const __targetName____GroupName__ = queryWrapper(
  async (
    dbKey: DbKey,
    params: StubParams,
  ): Promise<ReturnsError<StubEntity, __TargetName____GroupName__Error>> => {
    const db = __serviceName__DbManager.get(dbKey)!;
    // TODO: replace this logic with your actual logic
    // For reference, this is standard "create" logic
    const result = await db
      .insert(__groupName__Table)
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
