import { secretsDbManager } from "../../instances.ts";
import {
  SecretsNotFoundError,
  SecretAlreadyExistsError,
} from "../../errors.ts";
import type { UpdateSecretsParams, SecretsEntity } from "../../types.ts";
import type { ReturnsError } from "@saflib/monorepo";

import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { secretsTable } from "../../schemas/secrets.ts";
import { eq } from "drizzle-orm";

export type UpdateError = SecretsNotFoundError | SecretAlreadyExistsError;

export const update = queryWrapper(
  async (
    dbKey: DbKey,
    params: UpdateSecretsParams,
  ): Promise<ReturnsError<SecretsEntity, UpdateError>> => {
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
          error: new SecretsNotFoundError(
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
