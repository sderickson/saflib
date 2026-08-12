import { insert, type InsertResult } from "./insert.ts";
import { getByHash, type GetByHashResult } from "./get-by-hash.ts";
import { list, type ListParams, type ListPage, type ListResult } from "./list.ts";
import { getLatest, type GetLatestResult } from "./get-latest.ts";
import type { AnalyzedCommitEntity } from "../../schemas/analyzed-commits.ts";

const analyzedCommitsDb = {
  insert,
  getByHash,
  list,
  getLatest,
};

export {
  analyzedCommitsDb,
  type InsertResult,
  type GetByHashResult,
  type ListParams,
  type ListPage,
  type ListResult,
  type GetLatestResult,
  type AnalyzedCommitEntity,
};
