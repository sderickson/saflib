import { secretsDbManager } from "../../instances.ts";
import type { ServiceTokenEntity } from "../../types.ts";
import type { ReturnsError } from "@saflib/monorepo";

import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { serviceTokensTable } from "../../schemas/service-token.ts";

export type ListError = never;

export const list = queryWrapper(
  async (
    dbKey: DbKey,
  ): Promise<ReturnsError<ServiceTokenEntity[], ListError>> => {
    const db = secretsDbManager.get(dbKey)!;
    const result = await db.select().from(serviceTokensTable);

    return {
      result,
    };
  },
);
