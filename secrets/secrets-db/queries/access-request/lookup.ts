import { secretsDbManager } from "../../instances.ts";
import { AccessRequestNotFoundError } from "../../errors.ts";
import type { AccessRequestEntity } from "../../types.ts";
import type { ReturnsError } from "@saflib/monorepo";

import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { accessRequestTable } from "../../schemas/access-request.ts";
import { secretTable } from "../../schemas/secret.ts";
import { eq, and } from "drizzle-orm";

export type LookupAccessRequestError = AccessRequestNotFoundError;

export interface LookupAccessRequestParams {
  serviceName: string;
  secretId: string;
}

export const lookup = queryWrapper(
  async (
    dbKey: DbKey,
    params: LookupAccessRequestParams,
  ): Promise<ReturnsError<AccessRequestEntity, LookupAccessRequestError>> => {
    const db = secretsDbManager.get(dbKey)!;

    // Look up access request by service name and secret name
    const result = await db
      .select()
      .from(accessRequestTable)
      .where(
        and(
          eq(accessRequestTable.serviceName, params.serviceName),
          eq(accessRequestTable.secretId, params.secretId),
        ),
      )
      .limit(1);

    if (result.length === 0) {
      return {
        error: new AccessRequestNotFoundError(
          `No access request found for service '${params.serviceName}' and secret '${params.secretId}'`,
        ),
      };
    }

    return {
      result: result[0],
    };
  },
);
