import { getByHashes, type GetByHashesResult } from "./get-by-hashes.ts";
import { upsertMany, type UpsertManyResult } from "./upsert-many.ts";
import type { BlobFactEntity } from "../../schemas/blob-facts.ts";

const blobFactsDb = {
  getByHashes,
  upsertMany,
};

export {
  blobFactsDb,
  type GetByHashesResult,
  type UpsertManyResult,
  type BlobFactEntity,
};
