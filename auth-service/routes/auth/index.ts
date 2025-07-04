import express from "express";
import { resendVerificationHandler } from "./resend-verification.ts";
import { loginHandler } from "./login.ts";
import { logoutHandler } from "./logout.ts";
import { registerHandler } from "./register.ts";
import { verifyHandler } from "./verify.ts";
import { forgotPasswordHandler } from "./forgot-password.ts";
import { resetPasswordHandler } from "./reset-password.ts";
import { verifyEmailHandler } from "./verify-email.ts";
import { setPassword } from "./set-password.ts";
import { getProfileHandler } from "./get-profile.ts";
import { updateProfile } from "./update-profile.ts";
import { rateLimit } from "express-rate-limit";
import { createPreMiddleware } from "@saflib/express";
import passport from "passport";
import { setupPassport } from "../../middleware/passport.ts";
import { makeSessionMiddleware } from "../../middleware/session-store.ts";
import { jsonSpec } from "@saflib/auth-spec";
import * as cookieParser from "cookie-parser";
import { csrfDSC } from "../../middleware/csrf.ts";

export const makeAuthRouter = () => {
  const router = express.Router();

  router.use(
    createPreMiddleware({
      apiSpec: jsonSpec,
      authRequired: false,
      subsystemName: "auth",
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

  setupPassport();
  router.use(passport.initialize());
  router.use(passport.session());

  router.get("/verify", verifyHandler);
  router.post("/logout", logoutHandler);
  router.get("/profile", getProfileHandler);
  router.put("/profile", updateProfile);

  // rate limit after /verify, because verify runs before every single API call...
  if (process.env.DISABLE_RATE_LIMITING !== "true") {
    router.use(rateLimit());
  }
  router.post("/login", loginHandler);
  router.post("/register", registerHandler);
  router.post("/forgot-password", forgotPasswordHandler);
  router.post("/reset-password", resetPasswordHandler);
  router.post("/resend-verification", resendVerificationHandler);
  router.post("/verify-email", verifyEmailHandler);
  router.post("/set-password", setPassword);
  return router;
};
