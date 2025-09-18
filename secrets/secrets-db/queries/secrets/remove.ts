import { secretsDbManager } from "../../instances.ts";
import { SecretNotFoundError } from "../../errors.ts";
import type { SecretEntity } from "../../types.ts";
import type { ReturnsError } from "@saflib/monorepo";

import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { secretTable } from "../../schemas/secret.ts";
import { eq } from "drizzle-orm";

export type RemoveError = SecretNotFoundError;

export const remove = queryWrapper(
  async (
    dbKey: DbKey,
    id: string,
  ): Promise<ReturnsError<SecretEntity, RemoveError>> => {
    const db = secretsDbManager.get(dbKey)!;
    const result = await db
      .delete(secretTable)
      .where(eq(secretTable.id, id))
      .returning();

    if (result.length === 0) {
      return {
        error: new SecretNotFoundError(`Secret with id '${id}' not found`),
      };
    }

    return {
      result: result[0],
    };
  },
);
