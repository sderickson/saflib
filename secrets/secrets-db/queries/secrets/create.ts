import { secretsDbManager } from "../../instances.ts";
import { SecretAlreadyExistsError } from "../../errors.ts";
import type { SecretsEntity } from "../../schemas/secrets.ts";
import type { ReturnsError } from "@saflib/monorepo";

import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { secretsTable } from "../../schemas/secrets.ts";

export type CreateSecretsParams = Omit<
  SecretsEntity,
  "id" | "createdAt" | "updatedAt"
>;
export type CreateError = SecretAlreadyExistsError;

export const create = queryWrapper(
  async (
    dbKey: DbKey,
    params: CreateSecretsParams,
  ): Promise<ReturnsError<SecretsEntity, CreateError>> => {
    const db = secretsDbManager.get(dbKey);

    const now = new Date();
    try {
      const result = await db
        .insert(secretsTable)
        .values({
          ...params,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return { result: result[0] };
    } catch (e: unknown) {
      if (
        e instanceof Error &&
        e.message.includes("UNIQUE constraint failed: secrets.name")
      ) {
        return {
          error: new SecretAlreadyExistsError(),
        };
      }
      throw e;
    }
  },
);
