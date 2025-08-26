import { queryWrapper } from "@saflib/drizzle";
import { emailAuth } from "../../schemas/index.ts";
import { identityDbManager } from "../../instances.ts";
import type { DbKey } from "@saflib/drizzle";
import type { NewEmailAuth, SelectEmailAuth } from "../../types.ts";

export const create = queryWrapper(
  async (dbKey: DbKey, auth: NewEmailAuth): Promise<SelectEmailAuth> => {
    const db = identityDbManager.get(dbKey)!;
    const result = await db.insert(emailAuth).values(auth).returning();
    return result[0];
  },
);
