import { secretsDbManager } from "../../instances.ts";
import type { ServiceTokenEntity } from "../../types.ts";
import type { ReturnsError } from "@saflib/monorepo";

import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { serviceTokensTable } from "../../schemas/service-token.ts";
import { desc, eq, and } from "drizzle-orm";

export interface ListServiceTokensParams {
  limit?: number;
  offset?: number;
  approved?: boolean;
  serviceName?: string;
}

export type ListError = never;

export const list = queryWrapper(
  async (
    dbKey: DbKey,
    params: ListServiceTokensParams = {},
  ): Promise<ReturnsError<ServiceTokenEntity[], ListError>> => {
    const db = secretsDbManager.get(dbKey)!;

    const query = db
      .select()
      .from(serviceTokensTable)
      .orderBy(desc(serviceTokensTable.requestedAt));

    // Apply filters if specified
    const conditions = [];
    if (params.approved !== undefined) {
      conditions.push(eq(serviceTokensTable.approved, params.approved));
    }
    if (params.serviceName !== undefined) {
      conditions.push(eq(serviceTokensTable.serviceName, params.serviceName));
    }

    if (conditions.length > 0) {
      query.where(and(...conditions));
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
