import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/monorepo";
import { devSiteDbManager } from "../../instances.ts";
import {
  exportDefsTable,
  type ExportDefEntity,
} from "../../schemas/exports.ts";
import { commitExportsTable } from "../../schemas/commit-exports.ts";
import type { InsertExportParams } from "../../types.ts";
import { hashExportIdentity } from "../../hashes.ts";
import { chunkArray, insertBatchSize } from "../../sqlite-batch.ts";

export type InsertManyResult = ReturnsError<ExportDefEntity[], never>;

const DEF_BATCH = insertBatchSize(5); // hash, package, path, name, kind
const LINK_BATCH = insertBatchSize(2); // commit_hash, export_hash

export const insertMany = queryWrapper(
  async (
    dbKey: DbKey,
    rows: InsertExportParams[],
  ): Promise<InsertManyResult> => {
    if (rows.length === 0) {
      return { result: [] };
    }
    const db = devSiteDbManager.get(dbKey)!;

    const defsByHash = new Map<string, ExportDefEntity>();
    const linkKeys = new Map<
      string,
      { commitHash: string; exportHash: string }
    >();
    for (const row of rows) {
      const hash = hashExportIdentity(row);
      if (!defsByHash.has(hash)) {
        defsByHash.set(hash, {
          hash,
          packageName: row.packageName,
          filePath: row.filePath,
          name: row.name,
          kind: row.kind,
        });
      }
      linkKeys.set(`${row.commitHash}:${hash}`, {
        commitHash: row.commitHash,
        exportHash: hash,
      });
    }
    const defs = [...defsByHash.values()];
    const links = [...linkKeys.values()];

    db.transaction((tx) => {
      for (const batch of chunkArray(defs, DEF_BATCH)) {
        tx.insert(exportDefsTable).values(batch).onConflictDoNothing().run();
      }
      for (const batch of chunkArray(links, LINK_BATCH)) {
        tx.insert(commitExportsTable).values(batch).onConflictDoNothing().run();
      }
    });

    return { result: defs };
  },
);
