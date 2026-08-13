import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/monorepo";
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
      byHash.set(row.blobHash, row);
    }
    const unique = [...byHash.values()];

    db.transaction((tx) => {
      for (const row of unique) {
        tx.insert(blobFactsTable)
          .values(row)
          .onConflictDoUpdate({
            target: blobFactsTable.blobHash,
            set: {
              analyzerVersion: row.analyzerVersion,
              lineCount: row.lineCount,
              specialty: row.specialty,
              computedAt: row.computedAt,
            },
          })
          .run();
      }
    });

    return { result: unique };
  },
);
