import { secretsDbManager } from "../../instances.ts";
import { AccessRequestAlreadyExistsError } from "../../errors.ts";
import type {
  CreateAccessRequestParams,
  AccessRequestEntity,
} from "../../types.ts";
import type { ReturnsError } from "@saflib/monorepo";

import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { accessRequestTable } from "../../schemas/access-request.ts";

export type CreateError = AccessRequestAlreadyExistsError;

export const create = queryWrapper(
  async (
    dbKey: DbKey,
    params: CreateAccessRequestParams,
  ): Promise<ReturnsError<AccessRequestEntity, CreateError>> => {
    const db = secretsDbManager.get(dbKey)!;
    try {
      const result = await db
        .insert(accessRequestTable)
        .values({
          ...params,
          requestedAt: new Date(),
          accessCount: 0,
          status: "pending",
        })
        .returning();
      return {
        result: result[0],
      };
    } catch (error: any) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        return {
          error: new AccessRequestAlreadyExistsError(
            `Access request already exists`,
          ),
        };
      }
      throw error;
    }
  },
);
