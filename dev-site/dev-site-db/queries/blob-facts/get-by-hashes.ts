import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { inArray } from "drizzle-orm";
import type { ReturnsError } from "@saflib/monorepo";
import { devSiteDbManager } from "../../instances.ts";
import {
  blobFactsTable,
  type BlobFactEntity,
} from "../../schemas/blob-facts.ts";
import { chunkArray, insertBatchSize } from "../../sqlite-batch.ts";

export type GetByHashesResult = ReturnsError<BlobFactEntity[], never>;

export const getByHashes = queryWrapper(
  async (dbKey: DbKey, hashes: string[]): Promise<GetByHashesResult> => {
    if (hashes.length === 0) {
      return { result: [] };
    }
    const db = devSiteDbManager.get(dbKey)!;
    const result: BlobFactEntity[] = [];
    for (const batch of chunkArray(hashes, insertBatchSize(1))) {
      const rows = await db
        .select()
        .from(blobFactsTable)
        .where(inArray(blobFactsTable.blob_hash, batch));
      result.push(...rows);
    }
    return { result };
  },
);
