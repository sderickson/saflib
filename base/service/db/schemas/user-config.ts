import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { Expect, Equal } from "@saflib/drizzle";

/**
 * Per-user display preferences and marketing / terms-of-service consent.
 * Kratos owns identity/auth; this product table holds user-facing prefs only.
 * `userId` matches the Kratos identity id (not a generateShortId value).
 *
 * Lazy-create: empty rows are inserted on first `GET /user-configs/mine`
 * (`createIfMissingUserConfig`), not via a Kratos registration webhook.
 */
export interface UserConfigEntity {
  userId: string;
  displayName: string;
  marketingEmailsOptIn: boolean;
  marketingEmailsOptInAt: Date | null;
  termsOfServiceAgreedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const userConfigTable = sqliteTable("user_config", {
  userId: text("user_id").primaryKey(),
  displayName: text("display_name").notNull().default(""),
  marketingEmailsOptIn: integer("marketing_emails_opt_in", {
    mode: "boolean",
  })
    .notNull()
    .default(false),
  marketingEmailsOptInAt: integer("marketing_emails_opt_in_at", {
    mode: "timestamp",
  }),
  termsOfServiceAgreedAt: integer("terms_of_service_agreed_at", {
    mode: "timestamp",
  }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type UserConfigEntityTest = Expect<
  Equal<UserConfigEntity, typeof userConfigTable.$inferSelect>
>;
