import { registerRouter } from "./auth-register.ts";
import { loginRouter } from "./auth-login.ts";
import { authLogoutRouter } from "./auth-logout.ts";
import { Router } from "express";
const authRouter = Router();

authRouter.use("/auth", registerRouter);
authRouter.use("/auth", loginRouter);
authRouter.use("/auth", authLogoutRouter);

export { authRouter };
