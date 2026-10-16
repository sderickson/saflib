import type { Handler } from "express";
import {
  OPENAPI_TAG_EMAIL_VERIFIED,
  OPENAPI_TAG_MFA_REQUIRED,
  OPENAPI_TAG_NO_AUTH,
  OPENAPI_TAG_SITE_ADMIN_ONLY,
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

const LEGACY_ACCESS_TAGS: readonly string[] = [
  OPENAPI_TAG_NO_AUTH,
  OPENAPI_TAG_EMAIL_VERIFIED,
  OPENAPI_TAG_MFA_REQUIRED,
  OPENAPI_TAG_SITE_ADMIN_ONLY,
];

type SecurityRequirement = Record<string, string[]>;

/**
 * Operation extension marking an intentionally unauthenticated route. Plain
 * `security: []` is rejected so that going public is always an explicit,
 * greppable decision rather than a one-token edit to an auth requirement.
 */
export const OPENAPI_EXTENSION_PUBLIC = "x-public" as const;

type OperationSecurityInfo = {
  operationId: string;
  security?: SecurityRequirement[];
  isPublic: boolean;
  tags: string[];
};

function toInfo(op: Record<string, unknown>): OperationSecurityInfo {
  return {
    operationId: String(op.operationId ?? "unknown"),
    security: op.security as SecurityRequirement[] | undefined,
    isPublic: op[OPENAPI_EXTENSION_PUBLIC] === true,
    tags: (op.tags as string[] | undefined) ?? [],
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

/** Declares access via OpenAPI (`security` or `x-public`) rather than legacy tags. */
function declaresAccess(op: OperationSecurityInfo): boolean {
  return op.security !== undefined || op.isPublic;
}

/** Build the middleware for one operation that declares `security` or `x-public`. */
function compileRequirement(
  { operationId, security, isPublic, tags }: OperationSecurityInfo,
  resolvers: SecurityResolvers,
): Handler[] {
  const fail = (message: string): never => {
    throw new Error(`OpenAPI security for ${operationId}: ${message}`);
  };

  const legacy = tags.filter((t) => LEGACY_ACCESS_TAGS.includes(t));
  if (legacy.length > 0) {
    fail(`remove legacy access tags (${legacy.join(", ")}) when declaring security`);
  }
  if (isPublic) {
    // `security: []` alongside is allowed so specs with a document-wide
    // default stay accurate for other OpenAPI tooling.
    if (security !== undefined && security.length > 0) {
      fail(`\`${OPENAPI_EXTENSION_PUBLIC}: true\` cannot be combined with security requirements`);
    }
    return [];
  }
  if (security === undefined) {
    return fail("missing security");
  }
  if (security.length === 0) {
    fail(`use \`${OPENAPI_EXTENSION_PUBLIC}: true\` for public operations instead of \`security: []\``);
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
 * Compile OpenAPI `security` into middleware.
 *
 * - No operation declares `security` or `x-public`: returns `undefined`;
 *   callers use tag-based auth.
 * - Single-operation spec (the normal per-route case): compiled at mount
 *   time, so unknown schemes/scopes, OR'd requirements, or legacy access
 *   tags alongside `security` throw at startup.
 * - Multi-operation spec (whole-service validators, some tests): dispatches
 *   on the matched `operationId`, compiling each operation's security on
 *   first use (same errors, surfaced as a 500 rather than at startup).
 *   Operations without `security`/`x-public` there get `legacyAuth`.
 */
export function compileOperationSecurity(
  apiSpec: OpenApiDocument,
  resolvers: SecurityResolvers = {},
  legacyAuth: Handler[] = [],
): Handler[] | undefined {
  const operations = listOperations(apiSpec);
  if (!operations.some(declaresAccess)) {
    return undefined;
  }

  if (operations.length === 1) {
    const op = operations[0]!;
    return compileRequirement(op, resolvers);
  }

  const compiled = new Map<string, Handler>();
  const legacyChain = runChain(legacyAuth);
  const dispatcher: Handler = (req, res, next) => {
    const schema = req.openapi?.schema as Record<string, unknown> | undefined;
    if (!schema) {
      next(new Error("OpenAPI security requires a matched OpenAPI operation"));
      return;
    }
    const info = toInfo(schema);
    if (!declaresAccess(info)) {
      legacyChain(req, res, next);
      return;
    }
    let chain = compiled.get(info.operationId);
    if (!chain) {
      try {
        chain = runChain(
          compileRequirement(info, resolvers),
        );
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
