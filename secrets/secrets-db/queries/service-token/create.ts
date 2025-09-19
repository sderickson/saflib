import { secretsDbManager } from "../../instances.ts";
import { ServiceTokenAlreadyExistsError } from "../../errors.ts";
import type {
  CreateServiceTokenParams,
  ServiceTokenEntity,
} from "../../types.ts";
import type { ReturnsError } from "@saflib/monorepo";

import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { serviceTokensTable } from "../../schemas/service-token.ts";

export type CreateError = ServiceTokenAlreadyExistsError;

export const create = queryWrapper(
  async (
    dbKey: DbKey,
    params: CreateServiceTokenParams,
  ): Promise<ReturnsError<ServiceTokenEntity, CreateError>> => {
    const db = secretsDbManager.get(dbKey)!;
    try {
      const result = await db
        .insert(serviceTokensTable)
        .values({
          ...params,
          requestedAt: new Date(),
          approved: false,
          accessCount: 0,
        })
        .returning();
      return {
        result: result[0],
      };
    } catch (error: any) {
      if (
        error.code === "SQLITE_CONSTRAINT_UNIQUE" &&
        error.message.includes("service_tokens.token_hash")
      ) {
        return {
          error: new ServiceTokenAlreadyExistsError(
            `Service token with hash already exists`,
          ),
        };
      }
      throw error;
    }
  },
);
