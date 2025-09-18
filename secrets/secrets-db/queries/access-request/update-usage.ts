import { secretsDbManager } from "../../instances.ts";
import { AccessRequestNotFoundError } from "../../errors.ts";
import type {
  UpdateAccessRequestUsageParams,
  AccessRequestEntity,
} from "../../types.ts";
import type { ReturnsError } from "@saflib/monorepo";

import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { accessRequestTable } from "../../schemas/access-request.ts";
import { eq, sql } from "drizzle-orm";

export type UpdateUsageError = AccessRequestNotFoundError;

export const updateUsage = queryWrapper(
  async (
    dbKey: DbKey,
    params: UpdateAccessRequestUsageParams,
  ): Promise<ReturnsError<AccessRequestEntity, UpdateUsageError>> => {
    const db = secretsDbManager.get(dbKey)!;
    const result = await db
      .update(accessRequestTable)
      .set({
        lastAccessedAt: new Date(),
        accessCount: sql`${accessRequestTable.accessCount} + 1`,
      })
      .where(eq(accessRequestTable.id, params.id))
      .returning();

    if (result.length === 0) {
      return {
        error: new AccessRequestNotFoundError(
          `Access request with id '${params.id}' not found`,
        ),
      };
    }

    return {
      result: result[0],
    };
  },
);
