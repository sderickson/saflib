import { insertMany, type InsertManyResult } from "./insert-many.ts";
import { listByCommit, type ListByCommitResult } from "./list-by-commit.ts";
import type { TestCaseEntity } from "../../schemas/test-cases.ts";

const testCasesDb = {
  insertMany,
  listByCommit,
};

export {
  testCasesDb,
  type InsertManyResult,
  type ListByCommitResult,
  type TestCaseEntity,
};
