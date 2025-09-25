import { queryWrapper } from "@saflib/drizzle";
import type { SelectEmailAuth } from "../../types.ts";
import { emailAuth } from "../../schemas/index.ts";
import { inArray } from "drizzle-orm";
import { identityDbManager } from "../../instances.ts";
import type { DbKey } from "@saflib/drizzle";

export const getEmailAuthByUserIds = queryWrapper(
  async (dbKey: DbKey, ids: string[]): Promise<SelectEmailAuth[]> => {
    if (ids.length === 0) {
      return [];
    }
    const db = identityDbManager.get(dbKey)!;
    const result = await db
      .select()
      .from(emailAuth)
      .where(inArray(emailAuth.userId, ids))
      .execute();

    return result;
  },
);
