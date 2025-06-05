import { getSafContext } from "@saflib/node";
import type { Handler } from "express";
import type { Request } from "express";

function getScopesFromReq(req: Request) {
  const security = req.openapi?.schema.security || [];
  const requiredScopes = new Set<string>();

  for (const strategy of security) {
    if (strategy.scopes) {
      for (const scope of strategy.scopes) {
        requiredScopes.add(scope);
      }
    }
  }

  return requiredScopes;
}

/**
 * Creates middleware that validates user scopes against OpenAPI security requirements.
 * Expects the auth middleware to have run first so safContext is provided.
 * Throws 403 if user doesn't have required scopes.
 */
export const createScopeValidator = (): Handler => {
  return (req, res, next): void => {
    const { auth } = getSafContext();
    const requiredScopes = getScopesFromReq(req);

    if (requiredScopes.size === 0) {
      return next();
    }

    if (!auth) {
      res.status(401).json({
        message: "Unauthorized",
      });
      return;
    }

    const userScopes = new Set(auth.userScopes);

    if (userScopes.has("*")) {
      return next();
    }

    const missingScopes = requiredScopes.difference(userScopes);

    if (missingScopes.size > 0) {
      res.status(403).json({
        message: `Insufficient permissions. Missing scopes: ${Array.from(
          missingScopes,
        ).join(", ")}. You have the following scopes: ${Array.from(
          userScopes,
        ).join(", ")}`,
      });
      return;
    }

    return next();
  };
};
