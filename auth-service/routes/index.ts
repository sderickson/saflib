import { registerHandler } from "./auth-register.ts";
import { loginHandler } from "./auth-login.ts";
import { logoutHandler } from "./auth-logout.ts";
import { Router } from "express";
import { verifyHandler } from "./auth-verify.ts";
const authRouter = Router();

authRouter.use("/auth/login", loginHandler);
authRouter.use("/auth/register", registerHandler);
authRouter.use("/auth/logout", logoutHandler);
authRouter.use("/auth/verify", verifyHandler);
export { authRouter };
