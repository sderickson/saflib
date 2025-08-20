import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

// As a general rule, this table should contain members listed in OIDC Standard Claims.
// See: https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims
export const users = sqliteTable("users", {
  id: int().primaryKey({ autoIncrement: true }),
  createdAt: int("created_at", { mode: "timestamp" }).notNull(),
  lastLoginAt: int("last_login_at", { mode: "timestamp" }),
  email: text().notNull().unique(),
  emailVerified: int("email_verified", { mode: "boolean" }).default(false),
  name: text("name"),
  givenName: text("given_name"),
  familyName: text("family_name"),
});
