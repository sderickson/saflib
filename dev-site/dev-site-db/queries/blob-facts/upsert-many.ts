import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/utils";
import { devSiteDbManager } from "../../instances.ts";
import {
  blobFactsTable,
  type BlobFactEntity,
} from "../../schemas/blob-facts.ts";
import type { InsertBlobFactParams } from "../../types.ts";

export type UpsertManyResult = ReturnsError<BlobFactEntity[], never>;

export const upsertMany = queryWrapper(
  async (
    dbKey: DbKey,
    rows: InsertBlobFactParams[],
  ): Promise<UpsertManyResult> => {
    if (rows.length === 0) {
      return { result: [] };
    }
    const db = devSiteDbManager.get(dbKey)!;
    const byHash = new Map<string, InsertBlobFactParams>();
    for (const row of rows) {
      byHash.set(row.blob_hash, row);
    }
    const unique = [...byHash.values()];

    db.transaction((tx) => {
      for (const row of unique) {
        tx.insert(blobFactsTable)
          .values(row)
          .onConflictDoUpdate({
            target: blobFactsTable.blob_hash,
            set: {
              analyzer_version: row.analyzer_version,
              line_count: row.line_count,
              specialty: row.specialty,
              computed_at: row.computed_at,
            },
          })
          .run();
      }
    });

    return { result: unique };
  },
);
