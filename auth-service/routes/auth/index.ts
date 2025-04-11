import express from "express";
import { resendVerificationHandler } from "./resend-verification.ts";
import { loginHandler } from "./login.ts";
import { logoutHandler } from "./logout.ts";
import { registerHandler } from "./register.ts";
import { verifyHandler } from "./verify.ts";
import { forgotPasswordHandler } from "./forgot-password.ts";
import { resetPasswordHandler } from "./reset-password.ts";
import { verifyEmailHandler } from "./verify-email.ts";
import { AuthDB } from "@saflib/auth-db";
import { rateLimit } from "express-rate-limit";
import { createPreMiddleware } from "@saflib/node-express";
import passport from "passport";
import { setupPassport } from "@saflib/auth-service/middleware/passport.ts";
import { makeSessionMiddleware } from "@saflib/auth-service/middleware/session-store.ts";
import { jsonSpec } from "@saflib/auth-spec";
import * as cookieParser from "cookie-parser";
import { csrfDSC } from "@saflib/auth-service/middleware/csrf.ts";

export const makeRouter = (db: AuthDB) => {
  const router = express.Router();

  // Apply recommended middleware
  router.use(
    createPreMiddleware({
      apiSpec: jsonSpec,
      parseAuthHeaders: false,
    }),
  );

  router.use(cookieParser.default());

  const csrfProtection = csrfDSC({
    cookie: {
      domain:
        process.env.NODE_ENV === "test" ? undefined : `.${process.env.DOMAIN}`,
      secure: process.env.PROTOCOL === "https",
    },
  });
  router.use(csrfProtection);
  router.use(makeSessionMiddleware());

  // Initialize Passport and restore authentication state from session
  setupPassport(db);
  router.use(passport.initialize());
  router.use(passport.session());

  router.get("/auth/verify", verifyHandler);
  router.post("/auth/logout", logoutHandler);

  // rate limit after /auth/verify, because verify runs before every single API call...
  if (process.env.DISABLE_RATE_LIMITING !== "true") {
    router.use(rateLimit());
  }
  router.post("/auth/login", loginHandler);
  router.post("/auth/register", registerHandler);
  router.post("/auth/forgot-password", forgotPasswordHandler);
  router.post("/auth/reset-password", resetPasswordHandler);
  router.post("/auth/resend-verification", resendVerificationHandler);
  router.post("/auth/verify-email", verifyEmailHandler);
  return router;
};
