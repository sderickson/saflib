import { secretsDbManager } from "../../instances.ts";
import { SecretsNotFoundError } from "../../errors.ts";
import type { SecretsEntity } from "../../types.ts";
import type { ReturnsError } from "@saflib/monorepo";

import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { secretsTable } from "../../schemas/secrets.ts";
import { eq } from "drizzle-orm";

export type RemoveError = SecretsNotFoundError;

export const remove = queryWrapper(
  async (
    dbKey: DbKey,
    id: string,
  ): Promise<ReturnsError<SecretsEntity, RemoveError>> => {
    const db = secretsDbManager.get(dbKey)!;
    const result = await db
      .delete(secretsTable)
      .where(eq(secretsTable.id, id))
      .returning();

    if (result.length === 0) {
      return {
        error: new SecretsNotFoundError(`Secret with id '${id}' not found`),
      };
    }

    return {
      result: result[0],
    };
  },
);
