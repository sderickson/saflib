import { secretsDbManager } from "../../instances.ts";
import type { AccessRequestEntity } from "../../types.ts";
import type { ReturnsError } from "@saflib/monorepo";

import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { accessRequestTable } from "../../schemas/access-request.ts";
import { eq } from "drizzle-orm";

export type ListPendingError = never;

export const listPending = queryWrapper(
  async (
    dbKey: DbKey,
  ): Promise<ReturnsError<AccessRequestEntity[], ListPendingError>> => {
    const db = secretsDbManager.get(dbKey)!;
    const result = await db
      .select()
      .from(accessRequestTable)
      .where(eq(accessRequestTable.status, "pending"));

    return {
      result,
    };
  },
);
