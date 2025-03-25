import type { Handler } from "express";
import createError from "http-errors";

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      auth: {
        userId: number;
        userEmail: string;
      };
    }
  }
}

/**
 * Middleware that adds user information from headers to the request object.
 * Expects x-user-id and x-user-email headers to be set by authentication layer.
 * Throws 401 if headers are missing.
 */
export const auth: Handler = (req, _res, next): void => {
  const userId = req.headers["x-user-id"];
  const userEmail = req.headers["x-user-email"];

  if (!userId || !userEmail) {
    return next(createError(401, "Unauthorized"));
  }

  req.auth = {
    userId: parseInt(userId as string),
    userEmail: userEmail as string,
  };

  return next();
};
