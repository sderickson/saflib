import { secretsDbManager } from "../../instances.ts";
import { ServiceTokenNotFoundError } from "../../errors.ts";
import type {
  UpdateServiceTokenUsageParams,
  ServiceTokenEntity,
} from "../../types.ts";
import type { ReturnsError } from "@saflib/monorepo";

import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { serviceTokensTable } from "../../schemas/service-token.ts";
import { eq, sql } from "drizzle-orm";

export type UpdateUsageError = ServiceTokenNotFoundError;

export const updateUsage = queryWrapper(
  async (
    dbKey: DbKey,
    params: UpdateServiceTokenUsageParams,
  ): Promise<ReturnsError<ServiceTokenEntity, UpdateUsageError>> => {
    const db = secretsDbManager.get(dbKey)!;
    const result = await db
      .update(serviceTokensTable)
      .set({
        lastUsedAt: new Date(),
        accessCount: sql`${serviceTokensTable.accessCount} + 1`,
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
