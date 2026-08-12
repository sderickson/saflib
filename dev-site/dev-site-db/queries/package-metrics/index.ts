import { insertMany, type InsertManyResult } from "./insert-many.ts";
import { listByCommit, type ListByCommitResult } from "./list-by-commit.ts";
import type { PackageMetricsEntity } from "../../schemas/package-metrics.ts";

const packageMetricsDb = {
  insertMany,
  listByCommit,
};

export {
  packageMetricsDb,
  type InsertManyResult,
  type ListByCommitResult,
  type PackageMetricsEntity,
};
