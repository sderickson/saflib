import express from "express";
import { resendVerificationHandler } from "./auth-resend-verification.ts";
import { loginHandler } from "./auth-login.ts";
import { logoutHandler } from "./auth-logout.ts";
import { registerHandler } from "./auth-register.ts";
import { verifyHandler } from "./auth-verify.ts";
import { forgotPasswordHandler } from "./auth-forgot-password.ts";
import { resetPasswordHandler } from "./auth-reset-password.ts";

const router = express.Router();

router.post("/auth/login", loginHandler);
router.post("/auth/register", registerHandler);
router.post("/auth/logout", logoutHandler);
router.get("/auth/verify", verifyHandler);
router.post("/auth/forgot-password", forgotPasswordHandler);
router.post("/auth/reset-password", resetPasswordHandler);
router.post("/auth/resend-verification", resendVerificationHandler);
export { router as authRouter };
