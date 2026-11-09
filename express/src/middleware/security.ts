import type { Handler, Request } from "express";
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
  /**
   * The scheme authenticates the caller on its own, without a user session
   * (a machine credential such as an ops bearer token). A standalone scheme
   * must be the only scheme in its requirement; every other requirement must
   * include `session`. Operations secured only by standalone schemes skip
   * CSRF, since no cookie authenticates them.
   */
  standalone?: boolean;
  /**
   * For standalone schemes: whether this request carries the scheme's
   * credential (e.g. an `Authorization: Bearer` header). Required to offer the
   * scheme as an alternative to `session` (OpenAPI OR): a request it applies
   * to is authenticated by it alone; any other request takes the session
   * path. Must only inspect the request, not validate the credential.
   */
  applies?: (req: Request) => boolean;
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

/** Build the middleware for one requirement (AND of its schemes). */
function compileSingleRequirement(
  requirement: SecurityRequirement,
  allResolvers: SecurityResolvers,
  fail: (message: string) => never,
): Handler[] {
  // Session first: other schemes (e.g. org) read the resolved auth.
  const schemes = Object.keys(requirement).sort((a, b) =>
    a === "session" ? -1 : b === "session" ? 1 : 0,
  );
  const standalone = schemes.find((scheme) => allResolvers[scheme]?.standalone);
  if (standalone) {
    if (schemes.length > 1) {
      fail(
        `standalone scheme "${standalone}" must be the only scheme in its requirement`,
      );
    }
  } else if (!schemes.includes("session")) {
    fail(
      "authenticated requirements must include the `session` scheme (or one standalone scheme)",
    );
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

/** The standalone scheme a requirement consists of, if that's what it is. */
function standaloneSchemeOf(
  requirement: SecurityRequirement,
  allResolvers: SecurityResolvers,
): string | undefined {
  const schemes = Object.keys(requirement);
  return schemes.length === 1 && allResolvers[schemes[0]!]?.standalone ? schemes[0] : undefined;
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

  const allResolvers: SecurityResolvers = {
    session: sessionSecurityResolver,
    ...resolvers,
  };
  if (security.length === 1) {
    return compileSingleRequirement(security[0]!, allResolvers, fail);
  }

  // OR: any number of single standalone schemes (each must say when it
  // applies) plus at most one session requirement. A request is
  // authenticated by the first standalone scheme that applies to it, or else
  // by the session requirement; never by a mix.
  const alternatives = security.map((requirement) => {
    const scheme = standaloneSchemeOf(requirement, allResolvers);
    if (scheme && !allResolvers[scheme]!.applies) {
      fail(`standalone scheme "${scheme}" needs \`applies\` to be offered as an alternative`);
    }
    return {
      applies: scheme ? allResolvers[scheme]!.applies! : undefined,
      chain: runChain(compileSingleRequirement(requirement, allResolvers, fail)),
    };
  });
  const sessionAlternatives = alternatives.filter((a) => !a.applies);
  if (sessionAlternatives.length > 1) {
    fail("multiple (OR) security requirements may include at most one session requirement");
  }
  const fallback = sessionAlternatives[0] ?? alternatives[0]!;
  return [
    (req, res, next) => {
      const chosen = alternatives.find((a) => a.applies?.(req)) ?? fallback;
      chosen.chain(req, res, next);
    },
  ];
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

/**
 * True when the matched operation declares `security` and none of its
 * requirements includes `session`, i.e. it is secured by a standalone
 * (machine credential) scheme. Mount-time compilation rejects any other
 * session-less requirement, so this never matches an unsecured route.
 */
export function isSessionlessOperation(schema: object | undefined): boolean {
  const security = (schema as Record<string, unknown> | undefined)?.security;
  return (
    Array.isArray(security) &&
    security.length > 0 &&
    security.every(
      (requirement) =>
        typeof requirement === "object" &&
        requirement !== null &&
        !Object.prototype.hasOwnProperty.call(requirement, "session"),
    )
  );
}

/**
 * True when this request is authenticated by a standalone scheme that the
 * matched operation offers (as its only security or as an OR alternative to
 * `session`) and whose credential the request carries. Such requests have no
 * cookie session to protect, so CSRF doesn't apply.
 */
export function usesStandaloneCredential(
  req: Request,
  schema: object | undefined,
  resolvers: SecurityResolvers = {},
): boolean {
  if (isSessionlessOperation(schema)) return true;
  const security = (schema as Record<string, unknown> | undefined)?.security;
  if (!Array.isArray(security)) return false;
  return security.some((requirement) => {
    if (typeof requirement !== "object" || requirement === null) return false;
    const schemes = Object.keys(requirement);
    const resolver = schemes.length === 1 ? resolvers[schemes[0]!] : undefined;
    return Boolean(resolver?.standalone && resolver.applies?.(req));
  });
}

/** True when the matched operation is marked `x-public: true`. */
export function isPublicOperation(schema: object | undefined) {
  return (
    (schema as Record<string, unknown> | undefined)?.[
      OPENAPI_EXTENSION_PUBLIC
    ] === true
  );
}
