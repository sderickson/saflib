import { secretsDbManager } from "../../instances.ts";
import { SecretNotFoundError } from "../../errors.ts";
import type { SecretEntity } from "../../types.ts";
import type { ReturnsError } from "@saflib/monorepo";

import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { secretTable } from "../../schemas/secret.ts";
import { eq } from "drizzle-orm";

export type GetByNameError = SecretNotFoundError;

export const getByName = queryWrapper(
  async (
    dbKey: DbKey,
    name: string,
  ): Promise<ReturnsError<SecretEntity, GetByNameError>> => {
    const db = secretsDbManager.get(dbKey)!;
    const result = await db
      .select()
      .from(secretTable)
      .where(eq(secretTable.name, name))
      .limit(1);

    if (result.length === 0) {
      return {
        error: new SecretNotFoundError(`Secret with name '${name}' not found`),
      };
    }

    return {
      result: result[0],
    };
  },
);
