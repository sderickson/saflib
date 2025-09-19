import { secretsDbManager } from "../../instances.ts";
import type { SecretEntity } from "../../types.ts";
import type { ReturnsError } from "@saflib/monorepo";

import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { secretTable } from "../../schemas/secret.ts";
import { desc, eq } from "drizzle-orm";

export interface ListSecretsParams {
  limit?: number;
  offset?: number;
  isActive?: boolean;
}

export type ListError = never;

export const list = queryWrapper(
  async (
    dbKey: DbKey,
    params: ListSecretsParams = {},
  ): Promise<ReturnsError<SecretEntity[], ListError>> => {
    const db = secretsDbManager.get(dbKey)!;

    const query = db
      .select()
      .from(secretTable)
      .orderBy(desc(secretTable.updatedAt));

    // Apply is_active filter if specified
    if (params.isActive !== undefined) {
      query.where(eq(secretTable.isActive, params.isActive));
    }

    // Apply pagination
    if (params.limit !== undefined) {
      query.limit(params.limit);
    }
    if (params.offset !== undefined) {
      query.offset(params.offset);
    }

    const result = await query;

    return {
      result,
    };
  },
);
