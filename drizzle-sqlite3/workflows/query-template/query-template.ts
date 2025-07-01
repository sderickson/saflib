// @ts-nocheck - TODO remove this line as part of workflow
import { someDbManager } from "../../instances.ts";
import { SomeError } from "../../errors.ts";
import type { SomeDbType } from "../../types.ts";
import type { ReturnsError } from "@saflib/monorepo";

import { queryWrapper } from "@saflib/drizzle-sqlite3";
import type { DbKey } from "@saflib/drizzle-sqlite3";

type QueryTemplateError = SomeError;

type QueryTemplateResult = {
  // Add your query result type here
};

export const queryTemplate = queryWrapper(
  async (
    dbKey: DbKey,
    params: SomeDbType,
  ): Promise<ReturnsError<QueryTemplateResult, QueryTemplateError>> => {
    const db = someDbManager.get(dbKey);
    return { result: {} };
  },
);
