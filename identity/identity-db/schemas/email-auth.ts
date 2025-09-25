import { int, sqliteTable, text, blob } from "drizzle-orm/sqlite-core";
import { users } from "./users.ts";

// Email authentication
export const emailAuth = sqliteTable("email_auth", {
  userId: text("user_id")
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
