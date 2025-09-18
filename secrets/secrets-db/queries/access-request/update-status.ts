import { secretsDbManager } from "../../instances.ts";
import { AccessRequestNotFoundError } from "../../errors.ts";
import type {
  UpdateAccessRequestStatusParams,
  AccessRequestEntity,
} from "../../types.ts";
import type { ReturnsError } from "@saflib/monorepo";

import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { accessRequestTable } from "../../schemas/access-request.ts";
import { eq } from "drizzle-orm";

export type UpdateStatusError = AccessRequestNotFoundError;

export const updateStatus = queryWrapper(
  async (
    dbKey: DbKey,
    params: UpdateAccessRequestStatusParams,
  ): Promise<ReturnsError<AccessRequestEntity, UpdateStatusError>> => {
    const db = secretsDbManager.get(dbKey)!;
    const result = await db
      .update(accessRequestTable)
      .set({
        status: params.status,
        grantedBy: params.grantedBy,
        grantedAt: new Date(),
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
