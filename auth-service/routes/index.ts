import express from "express";
import { authRouter } from "./auth.ts";
import { loginHandler } from "./auth-login.ts";
import { logoutHandler } from "./auth-logout.ts";
import { registerHandler } from "./auth-register.ts";
import { verifyHandler } from "./auth-verify.ts";
import { forgotPasswordHandler } from "./auth-forgot-password.ts";

const router = express.Router();

router.use("/auth/login", loginHandler);
router.use("/auth/register", registerHandler);
router.use("/auth/logout", logoutHandler);
router.use("/auth/verify", verifyHandler);
router.use("/auth/forgot-password", forgotPasswordHandler);

export { router as authRouter };
