import createError, { HttpError } from "http-errors";
import type { Request, Response, NextFunction, Handler } from "express";

/**
 * 404 Handler
 * Catches requests to undefined routes
 */
export const notFoundHandler: Handler = (req, res, next) => {
  next(createError(404));
};

/**
 * Error Handler
 * Central error handling middleware that logs errors and returns standardized error responses
 */
export const errorHandler = (
  err: HttpError,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // Log error
  const status = err.status || 500;

  if (status >= 500) {
    if (!req.log) {
      console.error(err.stack);
    } else {
      req.log.error(err.stack);
    }
  }

  // Send error response
  res.status(status);
  res.json({
    message: err.message,
    status,
  });
};
