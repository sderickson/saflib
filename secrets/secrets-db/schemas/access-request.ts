import {
  sqliteTable,
  text,
  integer,
  unique,
  index,
} from "drizzle-orm/sqlite-core";
import type { Expect, Equal } from "@saflib/drizzle";

const statusEnum = ["pending", "granted", "denied"] as const;
export type AccessRequestStatus = (typeof statusEnum)[number];

export interface AccessRequestEntity {
  id: string;
  secretId: string;
  serviceName: string;
  requestedAt: Date;
  status: AccessRequestStatus;
  grantedAt: Date | null;
  grantedBy: string | null;
  accessCount: number;
  lastAccessedAt: Date | null;
}

export const accessRequestTable = sqliteTable(
  "access_request",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    secretId: text("secret_id").notNull(),
    serviceName: text("service_name").notNull(),
    requestedAt: integer("requested_at", { mode: "timestamp" }).notNull(),
    status: text("status", { enum: statusEnum }).notNull(),
    grantedAt: integer("granted_at", { mode: "timestamp" }),
    grantedBy: text("granted_by"),
    accessCount: integer("access_count").default(0).notNull(),
    lastAccessedAt: integer("last_accessed_at", { mode: "timestamp" }),
  },
  (table) => [
    unique().on(table.secretId, table.serviceName),
    index("access_request_requested_at_idx").on(table.requestedAt),
  ],
);

export type AccessRequestEntityTest = Expect<
  Equal<AccessRequestEntity, typeof accessRequestTable.$inferSelect>
>;
