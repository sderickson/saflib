import { secretsDbManager } from "../../instances.ts";
import { SecretsNotFoundError } from "../../errors.ts";
import type { SecretsEntity } from "../../types.ts";
import type { ReturnsError } from "@saflib/monorepo";

import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { secretsTable } from "../../schemas/secrets.ts";
import { eq } from "drizzle-orm";

export type GetByNameError = SecretsNotFoundError;

export const getByName = queryWrapper(
  async (
    dbKey: DbKey,
    name: string,
  ): Promise<ReturnsError<SecretsEntity, GetByNameError>> => {
    const db = secretsDbManager.get(dbKey)!;
    const result = await db
      .select()
      .from(secretsTable)
      .where(eq(secretsTable.name, name))
      .limit(1);

    if (result.length === 0) {
      return {
        error: new SecretsNotFoundError(`Secret with name '${name}' not found`),
      };
    }

    return {
      result: result[0],
    };
  },
);
