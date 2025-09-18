import { secretsDbManager } from "../../instances.ts";
import { SecretNotFoundError, SecretAlreadyExistsError } from "../../errors.ts";
import type { UpdateSecretParams, SecretEntity } from "../../types.ts";
import type { ReturnsError } from "@saflib/monorepo";

import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { secretsTable } from "../../schemas/secrets.ts";
import { eq } from "drizzle-orm";

export type UpdateError = SecretNotFoundError | SecretAlreadyExistsError;

export const update = queryWrapper(
  async (
    dbKey: DbKey,
    params: UpdateSecretParams,
  ): Promise<ReturnsError<SecretEntity, UpdateError>> => {
    const db = secretsDbManager.get(dbKey)!;

    try {
      const result = await db
        .update(secretsTable)
        .set({
          ...params,
          updatedAt: new Date(),
        })
        .where(eq(secretsTable.id, params.id))
        .returning();

      if (result.length === 0) {
        return {
          error: new SecretNotFoundError(
            `Secret with id '${params.id}' not found`,
          ),
        };
      }

      return {
        result: result[0],
      };
    } catch (error: any) {
      if (
        error.code === "SQLITE_CONSTRAINT_UNIQUE" &&
        error.message.includes("secrets.name")
      ) {
        return {
          error: new SecretAlreadyExistsError(
            `Secret with name '${params.name}' already exists`,
          ),
        };
      }
      throw error;
    }
  },
);
