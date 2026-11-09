import { randomUUID } from "node:crypto";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/utils";
import { desc, inArray } from "drizzle-orm";
import { opsDbManager } from "../../instances.ts";
import { opsDependencyChecks, type OpsDependencyCheck } from "../../schema.ts";

const KEEP = 30;

/** Store a check and keep only the newest 30. */
export const recordDependencyCheck = queryWrapper(
  async (
    dbKey: DbKey,
    params: { checkedAt: Date; lockfileHash: string; report: unknown },
  ): Promise<ReturnsError<OpsDependencyCheck, never>> => {
    const db = opsDbManager.get(dbKey)!;
    const [row] = await db
      .insert(opsDependencyChecks)
      .values({
        id: randomUUID(),
        checked_at: params.checkedAt,
        lockfile_hash: params.lockfileHash,
        report: JSON.stringify(params.report),
      })
      .returning();
    const old = await db
      .select({ id: opsDependencyChecks.id })
      .from(opsDependencyChecks)
      .orderBy(desc(opsDependencyChecks.checked_at))
      // SQLite needs a LIMIT to use OFFSET.
      .limit(1_000_000)
      .offset(KEEP);
    if (old.length) await db.delete(opsDependencyChecks).where(inArray(opsDependencyChecks.id, old.map((o) => o.id)));
    return { result: row! };
  },
);

/** The newest check, if any. */
export const getLatestDependencyCheck = queryWrapper(
  async (dbKey: DbKey): Promise<ReturnsError<OpsDependencyCheck | undefined, never>> => {
    const db = opsDbManager.get(dbKey)!;
    const row = await db.query.opsDependencyChecks.findFirst({ orderBy: [desc(opsDependencyChecks.checked_at)] });
    return { result: row };
  },
);
