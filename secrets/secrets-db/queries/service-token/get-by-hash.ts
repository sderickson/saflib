import { secretsDbManager } from "../../instances.ts";
import { ServiceTokenNotFoundError } from "../../errors.ts";
import type { ServiceTokenEntity } from "../../types.ts";
import type { ReturnsError } from "@saflib/monorepo";

import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { serviceTokensTable } from "../../schemas/service-token.ts";
import { eq } from "drizzle-orm";

export type GetByHashError = ServiceTokenNotFoundError;

export const getByHash = queryWrapper(
  async (
    dbKey: DbKey,
    tokenHash: string,
  ): Promise<ReturnsError<ServiceTokenEntity, GetByHashError>> => {
    const db = secretsDbManager.get(dbKey)!;
    const result = await db
      .select()
      .from(serviceTokensTable)
      .where(eq(serviceTokensTable.tokenHash, tokenHash))
      .limit(1);

    if (result.length === 0) {
      return {
        error: new ServiceTokenNotFoundError(
          `Service token with hash '${tokenHash}' not found`,
        ),
      };
    }

    return {
      result: result[0],
    };
  },
);
