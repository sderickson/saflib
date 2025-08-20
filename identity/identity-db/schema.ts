import { int, sqliteTable, text, blob } from "drizzle-orm/sqlite-core";

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

// Email authentication
export const emailAuth = sqliteTable("email_auth", {
  userId: int("user_id")
    .notNull()
    .references(() => users.id)
    .unique(),
  email: text("email").notNull().unique(),
  passwordHash: blob("password_hash").notNull(),

  // Verification
  verifiedAt: int("verified_at", { mode: "timestamp" }),
  verificationToken: text("verification_token"),
  verificationTokenExpiresAt: int("verification_token_expires_at", {
    mode: "timestamp",
  }),

  // Forgot password
  forgotPasswordToken: text("forgot_password_token"),
  forgotPasswordTokenExpiresAt: int("forgot_password_token_expires_at", {
    mode: "timestamp",
  }),
});
