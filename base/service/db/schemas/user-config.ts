import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { Expect, Equal } from "@saflib/drizzle";

/**
 * Per-user display preferences and marketing / terms-of-service consent.
 * Kratos owns identity/auth; this product table holds user-facing prefs only.
 * `user_id` matches the Kratos identity id (not a generateShortId value).
 *
 * Lazy-create: empty rows are inserted on first `GET /user-configs/mine`
 * (`createIfMissingUserConfig`), not via a Kratos registration webhook.
 */
export interface UserConfigEntity {
  user_id: string;
  display_name: string;
  marketing_emails_opt_in: boolean;
  marketing_emails_opt_in_at: Date | null;
  terms_of_service_agreed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export const userConfigTable = sqliteTable("user_config", {
  user_id: text("user_id").primaryKey(),
  display_name: text("display_name").notNull().default(""),
  marketing_emails_opt_in: integer("marketing_emails_opt_in", {
    mode: "boolean",
  })
    .notNull()
    .default(false),
  marketing_emails_opt_in_at: integer("marketing_emails_opt_in_at", {
    mode: "timestamp",
  }),
  terms_of_service_agreed_at: integer("terms_of_service_agreed_at", {
    mode: "timestamp",
  }),
  created_at: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updated_at: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type UserConfigEntityTest = Expect<
  Equal<UserConfigEntity, typeof userConfigTable.$inferSelect>
>;
