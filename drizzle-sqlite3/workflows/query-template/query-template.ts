// TODO: Uncomment and fix these imports
//import { someDb } from "@own/package";
//import { SomeError } from "../../errors.ts";
//import type { SomeDbType } from "../../types.ts";
import { ReturnsError } from "@saflib/monorepo";

import { queryWrapper } from "@saflib/drizzle-sqlite3";
import type { DbKey } from "@saflib/drizzle-sqlite3";

export type QueryTemplateParams = {
  // Add your query parameters here
};

export type QueryTemplateResult = {
  // Add your query result type here
};

export const queryTemplate = queryWrapper(
  async (
    dbKey: DbKey,
    params: QueryTemplateParams,
  ): Promise<ReturnsError<QueryTemplateResult>> => {
    // const db = mainDbManager.get(dbKey);
    return { result: {} };
  },
);
