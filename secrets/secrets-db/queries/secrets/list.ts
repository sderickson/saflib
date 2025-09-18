import { secretsDbManager } from "../../instances.ts";
import type { SecretEntity } from "../../types.ts";
import type { ReturnsError } from "@saflib/monorepo";

import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { secretTable } from "../../schemas/secret.ts";

export type ListError = never;

export const list = queryWrapper(
  async (dbKey: DbKey): Promise<ReturnsError<SecretEntity[], ListError>> => {
    const db = secretsDbManager.get(dbKey)!;
    const result = await db.select().from(secretTable);

    return {
      result,
    };
  },
);
