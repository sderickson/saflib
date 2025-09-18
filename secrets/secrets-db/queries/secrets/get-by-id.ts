import { secretsDbManager } from "../../instances.ts";
import { SecretNotFoundError } from "../../errors.ts";
import type { SecretEntity } from "../../types.ts";
import type { ReturnsError } from "@saflib/monorepo";

import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { secretTable } from "../../schemas/secret.ts";
import { eq } from "drizzle-orm";

export type GetByIdError = SecretNotFoundError;

export const getById = queryWrapper(
  async (
    dbKey: DbKey,
    id: string,
  ): Promise<ReturnsError<SecretEntity, GetByIdError>> => {
    const db = secretsDbManager.get(dbKey)!;
    const result = await db
      .select()
      .from(secretTable)
      .where(eq(secretTable.id, id))
      .limit(1);

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
