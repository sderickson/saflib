import { registerRouter } from "./auth-register.ts";
import { loginRouter } from "./auth-login.ts";
import { Router } from "express";
const authRouter = Router();

authRouter.use("/auth", registerRouter);
authRouter.use("/auth", loginRouter);

export { authRouter };
