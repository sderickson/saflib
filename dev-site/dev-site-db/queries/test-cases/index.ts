import { insertMany, type InsertManyResult } from "./insert-many.ts";
import {
  listByCommit,
  listHashesByCommit,
  countByCommit,
  getByHashes,
  type ListByCommitResult,
  type ListHashesByCommitResult,
  type CountByCommitResult,
  type GetByHashesResult,
} from "./list-by-commit.ts";
import type { TestCaseDefEntity } from "../../schemas/test-cases.ts";

const testCasesDb = {
  insertMany,
  listByCommit,
  listHashesByCommit,
  countByCommit,
  getByHashes,
};

export {
  testCasesDb,
  type InsertManyResult,
  type ListByCommitResult,
  type ListHashesByCommitResult,
  type CountByCommitResult,
  type GetByHashesResult,
  type TestCaseDefEntity,
};
