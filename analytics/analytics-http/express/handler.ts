import type { NextFunction, Request, RequestHandler, Response } from "express";

/** Promisified Express handler — avoids a dependency on `@saflib/express`. */
export function createHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
