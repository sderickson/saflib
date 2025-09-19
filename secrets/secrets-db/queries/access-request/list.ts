import { secretsDbManager } from "../../instances.ts";
import type { AccessRequestEntity } from "../../types.ts";
import type { ReturnsError } from "@saflib/monorepo";

import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { accessRequestTable } from "../../schemas/access-request.ts";
import { desc, eq, and } from "drizzle-orm";

export interface ListAccessRequestsParams {
  limit?: number;
  offset?: number;
  status?: "pending" | "granted" | "denied";
  serviceName?: string;
}

export type ListError = never;

export const list = queryWrapper(
  async (
    dbKey: DbKey,
    params: ListAccessRequestsParams = {},
  ): Promise<ReturnsError<AccessRequestEntity[], ListError>> => {
    const db = secretsDbManager.get(dbKey)!;

    const query = db
      .select()
      .from(accessRequestTable)
      .orderBy(desc(accessRequestTable.requestedAt));

    // Apply filters if specified
    const conditions = [];
    if (params.status !== undefined) {
      conditions.push(eq(accessRequestTable.status, params.status));
    }
    if (params.serviceName !== undefined) {
      conditions.push(eq(accessRequestTable.serviceName, params.serviceName));
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
