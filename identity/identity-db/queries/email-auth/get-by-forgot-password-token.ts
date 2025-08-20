import { type DbKey, queryWrapper } from "@saflib/drizzle-sqlite3";
import { emailAuth } from "../../schema.ts";
import type { SelectEmailAuth } from "../../types.ts";
import { TokenNotFoundError } from "../../errors.ts";
import { eq } from "drizzle-orm";
import type { ReturnsError } from "@saflib/monorepo";
import { identityDbManager } from "../../instances.ts";

export const getByForgotPasswordToken = queryWrapper(
  async (
    dbKey: DbKey,
    token: string,
  ): Promise<ReturnsError<SelectEmailAuth, TokenNotFoundError>> => {
    const db = identityDbManager.get(dbKey)!;
    const result = await db.query.emailAuth.findFirst({
      where: eq(emailAuth.forgotPasswordToken, token),
    });
    if (!result) {
      return { error: new TokenNotFoundError() };
    }
    return { result };
  },
);
