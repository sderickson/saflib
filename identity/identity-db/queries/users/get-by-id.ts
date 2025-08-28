import { queryWrapper } from "@saflib/drizzle";
import { users } from "../../schemas/index.ts";
import { identityDbManager } from "../../instances.ts";
import type { DbKey } from "@saflib/drizzle";
import type { User } from "../../types.ts";
import { UserNotFoundError } from "../../errors.ts";
import { eq } from "drizzle-orm";
import type { ReturnsError } from "@saflib/monorepo";

export const getById = queryWrapper(
  async (
    dbKey: DbKey,
    id: number,
  ): Promise<ReturnsError<User, UserNotFoundError>> => {
    const db = identityDbManager.get(dbKey)!;
    const result = await db.query.users.findFirst({
      where: eq(users.id, id),
    });
    if (!result) {
      return { error: new UserNotFoundError() };
    }
    return { result };
  },
);
