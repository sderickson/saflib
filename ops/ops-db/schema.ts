import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import type { Expect, Equal } from "@saflib/drizzle";

/** Every scope an ops token can hold. */
/**
 * `ops:read`: every GET. `ops:triage`: issue status changes and alert acks.
 * `ops:alerts-ingest`: only posting alerts (Alertmanager's webhook token).
 */
export const opsTokenScopes = ["ops:read", "ops:triage", "ops:alerts-ingest"] as const;

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
 * One process start. Rows whose build or release differs from the previous
 * start for the same service are deploys (`new_build`); the rest are restarts.
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
  /**
   * From the deploy's mounted release stamp (`/etc/saf/release/release.json`);
   * null when none is mounted. Changes on config-only deploys too.
   */
  released_at: Date | null;
  release_commit_root: string | null;
  release_commit_saflib: string | null;
  release_assets_hash: string | null;
  /** True when the build or the release differs from the previous start. */
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
  released_at: integer("released_at", { mode: "timestamp_ms" }),
  release_commit_root: text("release_commit_root"),
  release_commit_saflib: text("release_commit_saflib"),
  release_assets_hash: text("release_assets_hash"),
  new_build: integer("new_build", { mode: "boolean" }).notNull(),
});

export type OpsBootTest1 = Expect<Equal<OpsBoot, typeof opsBoots.$inferSelect>>;

/**
 * HMAC keys for signed graph links (`/ops/metrics/graph.*`). The newest
 * active key signs; any active key verifies. Created on first use, so there
 * is no secret to deploy. Revoking a key breaks every link it signed.
 */
export interface OpsGraphKey {
  id: string;
  /** 32 random bytes, base64url. */
  secret: string;
  created_at: Date;
  revoked_at: Date | null;
}

export const opsGraphKeys = sqliteTable("ops_graph_keys", {
  id: text("id").primaryKey(),
  secret: text("secret").notNull(),
  created_at: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  revoked_at: integer("revoked_at", { mode: "timestamp_ms" }),
});

export type OpsGraphKeyTest1 = Expect<Equal<OpsGraphKey, typeof opsGraphKeys.$inferSelect>>;

/**
 * An alert received from Alertmanager, one row per alert fingerprint (its
 * label set). Re-firing after a resolve updates the row and clears the ack.
 */
export interface OpsAlert {
  id: string;
  fingerprint: string;
  alertname: string;
  severity: string | null;
  status: "firing" | "resolved";
  /** JSON object of the alert's labels (set by alert rules). */
  labels: string;
  /** JSON object of annotations; may embed label values. */
  annotations: string;
  starts_at: Date;
  ends_at: Date | null;
  first_received_at: Date;
  last_received_at: Date;
  acked_at: Date | null;
  acked_by: string | null;
}

export const opsAlerts = sqliteTable("ops_alerts", {
  id: text("id").primaryKey(),
  fingerprint: text("fingerprint").notNull().unique(),
  alertname: text("alertname").notNull(),
  severity: text("severity"),
  status: text("status", { enum: ["firing", "resolved"] }).notNull(),
  labels: text("labels").notNull(),
  annotations: text("annotations").notNull(),
  starts_at: integer("starts_at", { mode: "timestamp_ms" }).notNull(),
  ends_at: integer("ends_at", { mode: "timestamp_ms" }),
  first_received_at: integer("first_received_at", { mode: "timestamp_ms" }).notNull(),
  last_received_at: integer("last_received_at", { mode: "timestamp_ms" }).notNull(),
  acked_at: integer("acked_at", { mode: "timestamp_ms" }),
  acked_by: text("acked_by"),
});

export type OpsAlertTest1 = Expect<Equal<OpsAlert, typeof opsAlerts.$inferSelect>>;
