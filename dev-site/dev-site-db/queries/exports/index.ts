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
import type { ExportDefEntity } from "../../schemas/exports.ts";

const exportsDb = {
  insertMany,
  listByCommit,
  listHashesByCommit,
  countByCommit,
  getByHashes,
};

export {
  exportsDb,
  type InsertManyResult,
  type ListByCommitResult,
  type ListHashesByCommitResult,
  type CountByCommitResult,
  type GetByHashesResult,
  type ExportDefEntity,
};
