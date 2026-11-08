import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import type { Expect, Equal } from "@saflib/drizzle";

/** Every scope an ops token can hold. */
export const opsTokenScopes = ["ops:read", "ops:triage"] as const;

export type OpsTokenScope = (typeof opsTokenScopes)[number];

/**
 * A machine credential for the ops API. Only the SHA-256 of the token is
 * stored; the plaintext is shown once, at creation.
 */
export interface OpsToken {
  /** Opaque id, safe to log and to show in admin UIs. */
  id: string;
  /** Human label, e.g. "maintenance agent (GitHub Actions)". */
  name: string;
  /** First characters of the secret after `safops_`, for recognizing a token. */
  token_prefix: string;
  /** Hex SHA-256 of the full token string. */
  token_hash: string;
  scopes: OpsTokenScope[];
  /** Kratos identity id of the admin who created it. */
  created_by: string | null;
  created_at: Date;
  expires_at: Date | null;
  /** Updated at most once per minute per token. */
  last_used_at: Date | null;
  revoked_at: Date | null;
}

export const opsTokens = sqliteTable("ops_tokens", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  token_prefix: text("token_prefix").notNull(),
  token_hash: text("token_hash").notNull().unique(),
  scopes: text("scopes", { mode: "json" }).$type<OpsTokenScope[]>().notNull(),
  created_by: text("created_by"),
  created_at: integer("created_at", { mode: "timestamp" }).notNull(),
  expires_at: integer("expires_at", { mode: "timestamp" }),
  last_used_at: integer("last_used_at", { mode: "timestamp" }),
  revoked_at: integer("revoked_at", { mode: "timestamp" }),
});

export type OpsTokenTest1 = Expect<Equal<OpsToken, typeof opsTokens.$inferSelect>>;
