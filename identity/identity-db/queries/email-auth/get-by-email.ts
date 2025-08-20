import { queryWrapper } from "@saflib/drizzle-sqlite3";
import { emailAuth } from "../../schemas/index.ts";
import { identityDbManager } from "../../instances.ts";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import type { SelectEmailAuth } from "../../types.ts";
import { EmailAuthNotFoundError } from "../../errors.ts";
import { eq } from "drizzle-orm";
import type { ReturnsError } from "@saflib/monorepo";

export const getByEmail = queryWrapper(
  async (
    dbKey: DbKey,
    email: string,
  ): Promise<ReturnsError<SelectEmailAuth, EmailAuthNotFoundError>> => {
    const db = identityDbManager.get(dbKey)!;
    const result = await db.query.emailAuth.findFirst({
      where: eq(emailAuth.email, email),
    });
    if (!result) {
      return { error: new EmailAuthNotFoundError() };
    }
    return { result };
  },
);
