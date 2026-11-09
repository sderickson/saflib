import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/utils";
import { and, count, desc, eq, gte, type SQL } from "drizzle-orm";
import { opsDbManager } from "../../instances.ts";
import { opsBoots, type OpsBoot } from "../../schema.ts";

export interface ListBootsParams {
  /** Only boots that started a new build (deploys). */
  newBuildsOnly?: boolean;
  limit: number;
}

export type ListBootsResult = ReturnsError<OpsBoot[], never>;

/** Boots newest first. */
export const listBoots = queryWrapper(
  async (dbKey: DbKey, params: ListBootsParams): Promise<ListBootsResult> => {
    const db = opsDbManager.get(dbKey)!;
    const where: SQL[] = [];
    if (params.newBuildsOnly) where.push(eq(opsBoots.new_build, true));
    const rows = await db.query.opsBoots.findMany({
      where: where.length ? and(...where) : undefined,
      orderBy: [desc(opsBoots.started_at)],
      limit: params.limit,
    });
    return { result: rows };
  },
);

export type CountBootsSinceResult = ReturnsError<number, never>;

/** How many processes started since `since` (restarts and deploys). */
export const countBootsSince = queryWrapper(
  async (dbKey: DbKey, since: Date): Promise<CountBootsSinceResult> => {
    const db = opsDbManager.get(dbKey)!;
    const [row] = await db
      .select({ n: count() })
      .from(opsBoots)
      .where(gte(opsBoots.started_at, since));
    return { result: row?.n ?? 0 };
  },
);
