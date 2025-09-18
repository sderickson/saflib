import { secretsDbManager } from "../../instances.ts";
import { AccessRequestNotFoundError } from "../../errors.ts";
import type { AccessRequestEntity } from "../../types.ts";
import type { ReturnsError } from "@saflib/monorepo";

import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { accessRequestTable } from "../../schemas/access-request.ts";
import { eq } from "drizzle-orm";

export type GetByIdError = AccessRequestNotFoundError;

export const getById = queryWrapper(
  async (
    dbKey: DbKey,
    id: string,
  ): Promise<ReturnsError<AccessRequestEntity, GetByIdError>> => {
    const db = secretsDbManager.get(dbKey)!;
    const result = await db
      .select()
      .from(accessRequestTable)
      .where(eq(accessRequestTable.id, id))
      .limit(1);

    if (result.length === 0) {
      return {
        error: new AccessRequestNotFoundError(
          `Access request with id '${id}' not found`,
        ),
      };
    }

    return {
      result: result[0],
    };
  },
);
