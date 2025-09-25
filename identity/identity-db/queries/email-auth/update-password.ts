import { type DbKey, queryWrapper } from "@saflib/drizzle";
import { emailAuth } from "../../schemas/index.ts";
import type { SelectEmailAuth } from "../../types.ts";
import { EmailAuthNotFoundError } from "../../errors.ts";
import { eq } from "drizzle-orm";
import type { ReturnsError } from "@saflib/monorepo";
import { identityDbManager } from "../../instances.ts";

export const updatePassword = queryWrapper(
  async (
    dbKey: DbKey,
    userId: string,
    passwordHash: Uint8Array,
  ): Promise<ReturnsError<SelectEmailAuth, EmailAuthNotFoundError>> => {
    const db = identityDbManager.get(dbKey)!;
    const result = await db
      .update(emailAuth)
      .set({ passwordHash })
      .where(eq(emailAuth.userId, userId))
      .returning();

    if (!result.length) {
      return { error: new EmailAuthNotFoundError() };
    }
    return { result: result[0] };
  },
);
