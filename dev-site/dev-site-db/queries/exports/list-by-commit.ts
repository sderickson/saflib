import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { eq, inArray, sql, asc } from "drizzle-orm";
import type { ReturnsError } from "@saflib/monorepo";
import { devSiteDbManager } from "../../instances.ts";
import {
  exportDefsTable,
  type ExportDefEntity,
} from "../../schemas/exports.ts";
import { commitExportsTable } from "../../schemas/commit-exports.ts";
import { chunkArray, insertBatchSize } from "../../sqlite-batch.ts";

export type ListByCommitResult = ReturnsError<ExportDefEntity[], never>;

export const listByCommit = queryWrapper(
  async (dbKey: DbKey, commitHash: string): Promise<ListByCommitResult> => {
    const db = devSiteDbManager.get(dbKey)!;
    const result = await db
      .select({
        hash: exportDefsTable.hash,
        packageName: exportDefsTable.packageName,
        filePath: exportDefsTable.filePath,
        name: exportDefsTable.name,
        kind: exportDefsTable.kind,
      })
      .from(commitExportsTable)
      .innerJoin(
        exportDefsTable,
        eq(commitExportsTable.exportHash, exportDefsTable.hash),
      )
      .where(eq(commitExportsTable.commitHash, commitHash))
      .orderBy(
        asc(exportDefsTable.packageName),
        asc(exportDefsTable.filePath),
        asc(exportDefsTable.name),
        asc(exportDefsTable.kind),
      );
    return { result };
  },
);

export type ListHashesByCommitResult = ReturnsError<string[], never>;

export const listHashesByCommit = queryWrapper(
  async (
    dbKey: DbKey,
    commitHash: string,
  ): Promise<ListHashesByCommitResult> => {
    const db = devSiteDbManager.get(dbKey)!;
    const rows = await db
      .select({ hash: commitExportsTable.exportHash })
      .from(commitExportsTable)
      .where(eq(commitExportsTable.commitHash, commitHash));
    return { result: rows.map((r) => r.hash) };
  },
);

export type CountByCommitResult = ReturnsError<number, never>;

export const countByCommit = queryWrapper(
  async (dbKey: DbKey, commitHash: string): Promise<CountByCommitResult> => {
    const db = devSiteDbManager.get(dbKey)!;
    const rows = await db
      .select({ n: sql<number>`count(*)`.mapWith(Number) })
      .from(commitExportsTable)
      .where(eq(commitExportsTable.commitHash, commitHash));
    return { result: rows[0]?.n ?? 0 };
  },
);

export type GetByHashesResult = ReturnsError<ExportDefEntity[], never>;

export const getByHashes = queryWrapper(
  async (dbKey: DbKey, hashes: string[]): Promise<GetByHashesResult> => {
    if (hashes.length === 0) {
      return { result: [] };
    }
    const db = devSiteDbManager.get(dbKey)!;
    const result: ExportDefEntity[] = [];
    for (const batch of chunkArray(hashes, insertBatchSize(1))) {
      const rows = await db
        .select()
        .from(exportDefsTable)
        .where(inArray(exportDefsTable.hash, batch));
      result.push(...rows);
    }
    return { result };
  },
);
