// @ts-nocheck - TODO remove this line as part of workflow
import { someDbManager } from "../../../../instances.ts";
import { SomeError } from "../../../../errors.ts";
import type { SomeDbType } from "../../../../types.ts";
import type { ReturnsError } from "@saflib/monorepo";

import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";

export type GetByIdError = SomeError;

export const getById = queryWrapper(
  async (
    dbKey: DbKey,
    params: SomeDbType,
  ): Promise<ReturnsError<SomeDbType, GetByIdError>> => {
    const db = someDbManager.get(dbKey);
    return { result: {} };
  },
);
