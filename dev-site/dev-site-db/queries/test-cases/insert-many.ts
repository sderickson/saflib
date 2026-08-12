import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/monorepo";
import { devSiteDbManager } from "../../instances.ts";
import {
  testCasesTable,
  type TestCaseEntity,
} from "../../schemas/test-cases.ts";
import type { InsertTestCaseParams } from "../../types.ts";

export type InsertManyResult = ReturnsError<TestCaseEntity[], never>;

export const insertMany = queryWrapper(
  async (
    dbKey: DbKey,
    rows: InsertTestCaseParams[],
  ): Promise<InsertManyResult> => {
    if (rows.length === 0) {
      return { result: [] };
    }
    const db = devSiteDbManager.get(dbKey)!;
    const result = await db.insert(testCasesTable).values(rows).returning();
    return { result };
  },
);
