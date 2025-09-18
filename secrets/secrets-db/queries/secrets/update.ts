import { secretsDbManager } from "../../instances.ts";
import { SecretsNotFoundError } from "../../errors.ts";
import type {
  CreateSecretsParams,
  SecretsEntity,
} from "../../types.ts";
import type { ReturnsError } from "@saflib/monorepo";

import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { secretsTable } from "../../schemas/secrets.ts";

export type SecretsError = SecretsNotFoundError;

export const update = queryWrapper(
  async (
    dbKey: DbKey,
    params: CreateSecretsParams,
  ): Promise<ReturnsError<SecretsEntity, SecretsError>> => {
    const db = secretsDbManager.get(dbKey)!;
    // TODO: replace this logic with your actual logic
    // For reference, this is standard "create" logic
    const result = await db
      .insert(secretsTable)
      .values({
        ...params,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return {
      result: {
        ...result[0],
      },
    };
  },
);
