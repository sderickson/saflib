import { randomUUID } from "node:crypto";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/utils";
import { opsDbManager } from "../../instances.ts";
import { opsTokens, type OpsToken, type OpsTokenScope } from "../../schema.ts";
import { mintOpsToken } from "../../tokens.ts";

export interface CreateTokenParams {
  name: string;
  scopes: OpsTokenScope[];
  createdBy: string | null;
  expiresAt?: Date | null;
}

/** The stored row plus the plaintext token, which is never retrievable again. */
export type CreateTokenResult = ReturnsError<
  { token: string; opsToken: OpsToken },
  never
>;

/** Mint and store a new ops token. */
export const createToken = queryWrapper(
  async (dbKey: DbKey, params: CreateTokenParams): Promise<CreateTokenResult> => {
    const db = opsDbManager.get(dbKey)!;
    const minted = mintOpsToken();
    const [opsToken] = await db
      .insert(opsTokens)
      .values({
        id: randomUUID(),
        name: params.name,
        token_prefix: minted.tokenPrefix,
        token_hash: minted.tokenHash,
        scopes: [...new Set(params.scopes)],
        created_by: params.createdBy,
        created_at: new Date(),
        expires_at: params.expiresAt ?? null,
      })
      .returning();
    return { result: { token: minted.token, opsToken: opsToken! } };
  },
);
