import { randomUUID } from "node:crypto";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/utils";
import { desc, eq } from "drizzle-orm";
import { opsDbManager } from "../../instances.ts";
import { opsBoots, type OpsBoot } from "../../schema.ts";

export type RecordBootParams = Omit<OpsBoot, "id" | "new_build" | "started_at"> & {
  started_at?: Date;
};

export type RecordBootResult = ReturnsError<OpsBoot, never>;

type DeployKeyFields = Pick<
  OpsBoot,
  | "build_ref"
  | "input_hash"
  | "commit_root"
  | "commit_saflib"
  | "release_commit_root"
  | "release_commit_saflib"
  | "release_assets_hash"
>;

/**
 * Identity of what was deployed: the image contents plus the release stamp.
 * Two boots with equal keys are a restart of the same deploy.
 */
function deployKey(b: DeployKeyFields) {
  return [
    b.build_ref,
    b.input_hash,
    b.commit_root,
    b.commit_saflib,
    b.release_commit_root,
    b.release_commit_saflib,
    b.release_assets_hash,
  ].join("|");
}

/**
 * Record a process start. `new_build` is true when the build or release
 * differs from the previous start of the same service (or there is none).
 */
export const recordBoot = queryWrapper(
  async (dbKey: DbKey, params: RecordBootParams): Promise<RecordBootResult> => {
    const db = opsDbManager.get(dbKey)!;
    const previous = await db.query.opsBoots.findFirst({
      where: eq(opsBoots.service_name, params.service_name),
      orderBy: [desc(opsBoots.started_at)],
    });
    const [row] = await db
      .insert(opsBoots)
      .values({
        ...params,
        id: randomUUID(),
        started_at: params.started_at ?? new Date(),
        new_build: !previous || deployKey(previous) !== deployKey(params),
      })
      .returning();
    return { result: row! };
  },
);
