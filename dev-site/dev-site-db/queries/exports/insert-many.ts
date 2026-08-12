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

export type InsertManyResult = ReturnsError<ExportDefEntity[], never>;

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

    await db.insert(exportDefsTable).values(defs).onConflictDoNothing();
    await db
      .insert(commitExportsTable)
      .values([...linkKeys.values()])
      .onConflictDoNothing();

    return { result: defs };
  },
);
