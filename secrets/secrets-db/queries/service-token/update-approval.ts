import { secretsDbManager } from "../../instances.ts";
import { ServiceTokenNotFoundError } from "../../errors.ts";
import type {
  UpdateServiceTokenApprovalParams,
  ServiceTokenEntity,
} from "../../types.ts";
import type { ReturnsError } from "@saflib/monorepo";

import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { serviceTokensTable } from "../../schemas/service-token.ts";
import { eq } from "drizzle-orm";

export type UpdateApprovalError = ServiceTokenNotFoundError;

export const updateApproval = queryWrapper(
  async (
    dbKey: DbKey,
    params: UpdateServiceTokenApprovalParams,
  ): Promise<ReturnsError<ServiceTokenEntity, UpdateApprovalError>> => {
    const db = secretsDbManager.get(dbKey)!;
    const result = await db
      .update(serviceTokensTable)
      .set({
        approved: params.approved,
        approvedBy: params.approvedBy,
        approvedAt: new Date(),
      })
      .where(eq(serviceTokensTable.id, params.id))
      .returning();

    if (result.length === 0) {
      return {
        error: new ServiceTokenNotFoundError(
          `Service token with id '${params.id}' not found`,
        ),
      };
    }

    return {
      result: result[0],
    };
  },
);
