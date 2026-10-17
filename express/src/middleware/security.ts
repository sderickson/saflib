import type { Handler } from "express";
import {
  OPENAPI_EXTENSION_PUBLIC,
  findOperationAccessProblem,
  type OpenApiDocument,
} from "@saflib/openapi";
import { makeAuthMiddleware } from "./auth.ts";

/**
 * Enforces one OpenAPI security scheme. `middleware` receives the scopes the
 * operation requires and returns ordinary Express middleware, which may reject
 * the request or attach context (e.g. `res.locals`, AsyncLocalStorage) before
 * calling `next()`. Middleware rather than an async predicate so that context
 * entered with `enterWith` survives into the handler.
 */
export interface SecurityResolver {
  /** Every scope this scheme understands; unknown scopes fail at mount time. */
  scopes: readonly string[];
  middleware: (scopes: string[]) => Handler[];
}

export type SecurityResolvers = Record<string, SecurityResolver>;

export const SESSION_SCOPE_EMAIL_VERIFIED = "email-verified" as const;
export const SESSION_SCOPE_MFA = "mfa" as const;
/** Implies email-verified + mfa. */
export const SESSION_SCOPE_SITE_ADMIN = "site-admin" as const;

/** Built-in `session` scheme: the caller's resolved SAF auth (Kratos or identity assertion). */
export const sessionSecurityResolver: SecurityResolver = {
  scopes: [
    SESSION_SCOPE_EMAIL_VERIFIED,
    SESSION_SCOPE_MFA,
    SESSION_SCOPE_SITE_ADMIN,
  ],
  middleware: (scopes) => [
    makeAuthMiddleware({
      adminRequired: scopes.includes(SESSION_SCOPE_SITE_ADMIN),
      emailVerificationRequired: scopes.includes(SESSION_SCOPE_EMAIL_VERIFIED),
      mfaRequired: scopes.includes(SESSION_SCOPE_MFA),
    }),
  ],
};

type SecurityRequirement = Record<string, string[]>;

export { OPENAPI_EXTENSION_PUBLIC };

type OperationSecurityInfo = {
  operationId: string;
  security?: SecurityRequirement[];
  isPublic: boolean;
  /** Set when `security` / `x-public` is missing or malformed. */
  problem?: string;
};

function toInfo(op: Record<string, unknown>): OperationSecurityInfo {
  return {
    operationId: String(op.operationId ?? "unknown"),
    security: op.security as SecurityRequirement[] | undefined,
    isPublic: op[OPENAPI_EXTENSION_PUBLIC] === true,
    problem: findOperationAccessProblem(op),
  };
}

function listOperations(apiSpec: OpenApiDocument): OperationSecurityInfo[] {
  return Object.values(apiSpec.paths ?? {}).flatMap((item) =>
    Object.entries(item ?? {})
      .filter(([method]) =>
        ["get", "post", "put", "patch", "delete"].includes(method),
      )
      .map(([, op]) => toInfo(op as Record<string, unknown>)),
  );
}

function failFor(operationId: string) {
  return (message: string): never => {
    throw new Error(`OpenAPI security for ${operationId}: ${message}`);
  };
}

/** Build the middleware for one operation from its `security` / `x-public`. */
function compileRequirement(
  { operationId, security, isPublic, problem }: OperationSecurityInfo,
  resolvers: SecurityResolvers,
): Handler[] {
  const fail = failFor(operationId);
  if (problem) {
    fail(problem);
  }
  if (isPublic || !security) {
    return [];
  }
  if (security.length > 1) {
    fail("multiple (OR) security requirements are not supported");
  }

  const allResolvers: SecurityResolvers = {
    session: sessionSecurityResolver,
    ...resolvers,
  };
  const requirement = security[0]!;
  // Session first: other schemes (e.g. org) read the resolved auth.
  const schemes = Object.keys(requirement).sort((a, b) =>
    a === "session" ? -1 : b === "session" ? 1 : 0,
  );
  if (!schemes.includes("session")) {
    fail("authenticated requirements must include the `session` scheme");
  }

  return schemes.flatMap((scheme) => {
    const resolver = allResolvers[scheme];
    if (!resolver) {
      return fail(`no resolver registered for scheme "${scheme}"`);
    }
    const scopes = requirement[scheme] ?? [];
    for (const scope of scopes) {
      if (!resolver.scopes.includes(scope)) {
        fail(`unknown scope "${scope}" for scheme "${scheme}"`);
      }
    }
    return resolver.middleware(scopes);
  });
}

/** Run handlers in order, as Express would for a route's middleware list. */
function runChain(handlers: Handler[]): Handler {
  return (req, res, next) => {
    const step = (i: number, err?: unknown): void => {
      if (err !== undefined && err !== null) {
        next(err);
        return;
      }
      const handler = handlers[i];
      if (!handler) {
        next();
        return;
      }
      try {
        void handler(req, res, (e?: unknown) => step(i + 1, e));
      } catch (e) {
        next(e);
      }
    };
    step(0);
  };
}

/**
 * Compile OpenAPI `security` / `x-public` into middleware. Every operation
 * must declare one or the other; a missing or malformed declaration throws at
 * mount time.
 *
 * - Single-operation spec (the normal per-route case): fully compiled at
 *   mount time, so unknown schemes/scopes and OR'd requirements also throw at
 *   startup.
 * - Multi-operation spec (whole-service validators, some tests): dispatches
 *   on the matched `operationId`, compiling each operation's requirement on
 *   first use. Unknown schemes there surface as a 500, never an open route.
 */
export function compileOperationSecurity(
  apiSpec: OpenApiDocument,
  resolvers: SecurityResolvers = {},
): Handler[] {
  const operations = listOperations(apiSpec);
  for (const op of operations) {
    if (op.problem) {
      failFor(op.operationId)(op.problem);
    }
  }

  if (operations.length === 1) {
    return compileRequirement(operations[0]!, resolvers);
  }

  const compiled = new Map<string, Handler>();
  const dispatcher: Handler = (req, res, next) => {
    const schema = req.openapi?.schema as Record<string, unknown> | undefined;
    if (!schema) {
      next(new Error("OpenAPI security requires a matched OpenAPI operation"));
      return;
    }
    const info = toInfo(schema);
    let chain = compiled.get(info.operationId);
    if (!chain) {
      try {
        chain = runChain(compileRequirement(info, resolvers));
      } catch (err) {
        next(err);
        return;
      }
      compiled.set(info.operationId, chain);
    }
    chain(req, res, next);
  };
  return [dispatcher];
}

/** True when the matched operation is marked `x-public: true`. */
export function isPublicOperation(schema: object | undefined) {
  return (
    (schema as Record<string, unknown> | undefined)?.[
      OPENAPI_EXTENSION_PUBLIC
    ] === true
  );
}
