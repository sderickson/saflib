import { insertMany, type InsertManyResult } from "./insert-many.ts";
import { listByCommit, type ListByCommitResult } from "./list-by-commit.ts";
import type { ExportEntity } from "../../schemas/exports.ts";

const exportsDb = {
  insertMany,
  listByCommit,
};

export {
  exportsDb,
  type InsertManyResult,
  type ListByCommitResult,
  type ExportEntity,
};
