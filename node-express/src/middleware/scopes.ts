import type { Handler } from "express";
import createError from "http-errors";
import type { OpenAPIV3 } from "express-openapi-validator/dist/framework/types.ts";

type HttpMethod =
  | "get"
  | "put"
  | "post"
  | "delete"
  | "options"
  | "head"
  | "patch"
  | "trace";

/**
 * Creates middleware that validates user scopes against OpenAPI security requirements.
 * Expects the auth middleware to have run first to populate req.auth.scopes.
 * Throws 403 if user doesn't have required scopes.
 */
export const createScopeValidator = (
  apiSpec: OpenAPIV3.DocumentV3,
): Handler => {
  return (req, _res, next): void => {
    // Get the operation from the OpenAPI spec
    const path = req.path;
    const method = req.method.toLowerCase() as HttpMethod;
    const operation = apiSpec.paths[path]?.[method];

    if (!operation) {
      return next();
    }

    // Check if operation requires scopes
    const security = operation.security || apiSpec.security || [];
    const requiredScopes = new Set<string>();

    // Extract required scopes from security requirements
    for (const strategy of security) {
      if (strategy.scopes) {
        for (const scope of strategy.scopes) {
          requiredScopes.add(scope);
        }
      }
    }

    // If no scopes required, allow access
    if (requiredScopes.size === 0) {
      return next();
    }

    // Check if user has all required scopes
    const userScopes = new Set(req.auth.scopes);
    const hasAllScopes = Array.from(requiredScopes).every((scope) =>
      userScopes.has(scope),
    );

    if (!hasAllScopes) {
      return next(
        createError(
          403,
          `Insufficient permissions. Required scopes: ${Array.from(
            requiredScopes,
          ).join(", ")}`,
        ),
      );
    }

    return next();
  };
};
