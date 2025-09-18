import { secretsDbManager } from "../../instances.ts";
import { SecretAlreadyExistsError } from "../../errors.ts";
import type { CreateSecretsParams, SecretsEntity } from "../../types.ts";
import type { ReturnsError } from "@saflib/monorepo";

import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { secretsTable } from "../../schemas/secrets.ts";

export type CreateError = SecretAlreadyExistsError;

export const create = queryWrapper(
  async (
    dbKey: DbKey,
    params: CreateSecretsParams,
  ): Promise<ReturnsError<SecretsEntity, CreateError>> => {
    const db = secretsDbManager.get(dbKey)!;
    try {
      const result = await db
        .insert(secretsTable)
        .values({
          ...params,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
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
