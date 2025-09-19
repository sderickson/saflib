import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import type { Expect, Equal } from "@saflib/drizzle";

export interface ServiceTokenEntity {
  id: string;
  serviceName: string;
  tokenHash: string;
  serviceVersion: string | null;
  requestedAt: Date;
  approved: boolean;
  approvedAt: Date | null;
  approvedBy: string | null;
  lastUsedAt: Date | null;
  accessCount: number;
}

export const serviceTokensTable = sqliteTable(
  "service_tokens",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    serviceName: text("service_name").notNull(),
    tokenHash: text("token_hash").unique().notNull(),
    serviceVersion: text("service_version"),
    requestedAt: integer("requested_at", { mode: "timestamp" }).notNull(),
    approved: integer("approved", { mode: "boolean" }).default(false).notNull(),
    approvedAt: integer("approved_at", { mode: "timestamp" }),
    approvedBy: text("approved_by"),
    lastUsedAt: integer("last_used_at", { mode: "timestamp" }),
    accessCount: integer("access_count").default(0).notNull(),
  },
  (table) => [index("service_tokens_requested_at_idx").on(table.requestedAt)],
);

export type ServiceTokenEntityTest = Expect<
  Equal<ServiceTokenEntity, typeof serviceTokensTable.$inferSelect>
>;
