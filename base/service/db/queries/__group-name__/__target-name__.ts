// @ts-nocheck — scaffold placeholders until drizzle/add-query copies this file.
import { baseDbManager } from "#instances.ts";
import { StubError } from "#errors.ts";
// TODO: import your actual types
import type { StubParams, StubEntity } from "#types.ts";
import type { ReturnsError } from "@saflib/monorepo";

import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { __groupName__Table } from "#schemas/__group-name__.ts";

export type __TargetName____GroupName__Error = StubError;

export const __targetName____GroupName__ = queryWrapper(
  async (
    dbKey: DbKey,
    params: StubParams,
  ): Promise<ReturnsError<StubEntity, __TargetName____GroupName__Error>> => {
    const db = baseDbManager.get(dbKey)!;
    // TODO: replace this logic with your actual logic
    // For reference, this is standard "create" logic
    const result = await db
      .insert(__groupName__Table)
      .values({
        ...params,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();
    return {
      result: {
        ...result[0],
      },
    };
  },
);
