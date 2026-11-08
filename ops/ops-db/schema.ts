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

/**
 * One process start. Rows whose build differs from the previous start for the
 * same service are deploys (`new_build`); the rest are restarts.
 */
export interface OpsBoot {
  id: string;
  service_name: string;
  started_at: Date;
  /** Blue-green color (`SAF_COLOR`), when set. */
  color: string | null;
  /** From the image's `/etc/saf/build.json`; null outside built images. */
  build_ref: string | null;
  image: string | null;
  input_hash: string | null;
  commit_root: string | null;
  commit_saflib: string | null;
  dirty: boolean | null;
  built_at: Date | null;
  node_version: string;
  new_build: boolean;
}

export const opsBoots = sqliteTable("ops_boots", {
  id: text("id").primaryKey(),
  service_name: text("service_name").notNull(),
  // Millisecond resolution: restarts can land within the same second.
  started_at: integer("started_at", { mode: "timestamp_ms" }).notNull(),
  color: text("color"),
  build_ref: text("build_ref"),
  image: text("image"),
  input_hash: text("input_hash"),
  commit_root: text("commit_root"),
  commit_saflib: text("commit_saflib"),
  dirty: integer("dirty", { mode: "boolean" }),
  built_at: integer("built_at", { mode: "timestamp" }),
  node_version: text("node_version").notNull(),
  new_build: integer("new_build", { mode: "boolean" }).notNull(),
});

export type OpsBootTest1 = Expect<Equal<OpsBoot, typeof opsBoots.$inferSelect>>;
