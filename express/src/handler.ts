import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Wrapper for Express handlers. Promisifies the handler, ensuring any uncaught
 * exceptions get passed to `next`.
 */
export const createHandler = (
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler => {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
};
