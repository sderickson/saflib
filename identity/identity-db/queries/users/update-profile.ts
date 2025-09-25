// TODO: Uncomment and fix these imports
import { queryWrapper } from "@saflib/drizzle";
import { users } from "../../schemas/index.ts";
import { identityDbManager } from "../../instances.ts";
import type { DbKey } from "@saflib/drizzle";
import type { User, UpdateProfileParams } from "../../types.ts";
import { UserNotFoundError } from "../../errors.ts";
import { eq } from "drizzle-orm";
import type { ReturnsError } from "@saflib/monorepo";

export const updateProfile = queryWrapper(
  async (
    dbKey: DbKey,
    userId: string,
    params: UpdateProfileParams,
  ): Promise<ReturnsError<User, UserNotFoundError>> => {
    const db = identityDbManager.get(dbKey)!;
    const result = await db
      .update(users)
      .set(params)
      .where(eq(users.id, userId))
      .returning();

    if (!result.length) {
      return { error: new UserNotFoundError() };
    }
    return { result: result[0] };
  },
);
