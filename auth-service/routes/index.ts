import express from "express";
import { resendVerificationHandler } from "./auth-resend-verification.ts";
import { loginHandler } from "./auth-login.ts";
import { logoutHandler } from "./auth-logout.ts";
import { registerHandler } from "./auth-register.ts";
import { verifyHandler } from "./auth-verify.ts";
import { forgotPasswordHandler } from "./auth-forgot-password.ts";
import { resetPasswordHandler } from "./auth-reset-password.ts";
import { verifyEmailHandler } from "./auth-verify-email.ts";

import { rateLimit } from "express-rate-limit";

export const makeRouter = () => {
  const router = express.Router();
  router.get("/auth/verify", verifyHandler);
  router.post("/auth/logout", logoutHandler);

  // rate limit after /auth/verify, because verify runs before every single API call...
  router.use(rateLimit());
  router.post("/auth/login", loginHandler);
  router.post("/auth/register", registerHandler);
  router.post("/auth/forgot-password", forgotPasswordHandler);
  router.post("/auth/reset-password", resetPasswordHandler);
  router.post("/auth/resend-verification", resendVerificationHandler);
  router.post("/auth/verify-email", verifyEmailHandler);
  return router;
};
