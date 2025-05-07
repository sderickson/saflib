import type { Handler } from "express";
import { createLogger } from "@saflib/node";

export const loggerInjector: Handler = (req, _res, next) => {
  // shortId provided by ./requestId.ts
  const reqId = (req as any).shortId || "no-request-id";
  req.log = createLogger(reqId);
  next();
};
