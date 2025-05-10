import type { Handler } from "express";
import { safStorage } from "@saflib/node";

/**
 * Middleware that adds user information from headers to the request object.
 * Expects x-user-id, x-user-email, and x-user-scopes headers to be set by authentication layer.
 * Throws 401 if required headers are missing.
 */
export const auth: Handler = (_req, res, next): void => {
  const { auth } = safStorage.getStore()!;

  if (!auth) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Unauthorized",
    });
    return;
  }

  return next();
};
