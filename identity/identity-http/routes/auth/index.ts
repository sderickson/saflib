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
import { createScopedMiddleware } from "@saflib/express";
import passport from "passport";
import { setupPassport } from "../../middleware/passport.ts";
import { makeSessionMiddleware } from "../../middleware/session-store.ts";
import { jsonSpec } from "@saflib/identity-spec";
import * as cookieParser from "cookie-parser";
import { csrfDSC } from "../../middleware/csrf.ts";
import { typedEnv } from "../../env.ts";

export const makeAuthRouter = () => {
  const router = express.Router();

  router.use(
    "/auth",
    createScopedMiddleware({
      apiSpec: jsonSpec,
      authRequired: false,
    }),
  );

  router.use("/auth", cookieParser.default());

  const csrfProtection = csrfDSC({
    cookie: {
      domain: typedEnv.NODE_ENV === "test" ? undefined : `.${typedEnv.DOMAIN}`,
      secure: typedEnv.PROTOCOL === "https",
    },
  });
  router.use("/auth", csrfProtection);
  router.use("/auth", makeSessionMiddleware());

  setupPassport();
  router.use("/auth", passport.initialize());
  router.use("/auth", passport.session());

  router.get("/auth/verify", verifyHandler);
  router.post("/auth/logout", logoutHandler);
  router.get("/auth/profile", getProfileHandler);
  router.put("/auth/profile", updateProfile);

  // rate limit after /verify, because verify runs before every single API call...
  if (typedEnv.IDENTITY_SERVICE_DISABLE_RATE_LIMITING !== "true") {
    router.use("/auth", rateLimit());
  }
  router.post("/auth/login", loginHandler);
  router.post("/auth/register", registerHandler);
  router.post("/auth/forgot-password", forgotPasswordHandler);
  router.post("/auth/reset-password", resetPasswordHandler);
  router.post("/auth/resend-verification", resendVerificationHandler);
  router.post("/auth/verify-email", verifyEmailHandler);
  router.post("/auth/set-password", setPassword);
  return router;
};
