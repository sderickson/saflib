import { secretsDbManager } from "../../instances.ts";
import type { SecretsEntity } from "../../types.ts";
import type { ReturnsError } from "@saflib/monorepo";

import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { secretsTable } from "../../schemas/secrets.ts";

export type ListError = never;

export const list = queryWrapper(
  async (dbKey: DbKey): Promise<ReturnsError<SecretsEntity[], ListError>> => {
    const db = secretsDbManager.get(dbKey)!;
    const result = await db.select().from(secretsTable);

    return {
      result,
    };
  },
);
