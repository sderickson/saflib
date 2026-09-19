/**
 * OpenAPI operation tags that change runtime behavior.
 *
 * Grouping / package tags are not allowed — package membership is enough.
 * Middleware and jobs must import these constants (no bare string literals).
 *
 * File-system scanners for route YAML live in `./operation-tags-files.ts` so
 * this module stays safe to import from browser-reachable barrels.
 */

export const OPENAPI_TAG_NO_AUTH = "no-auth" as const;
export const OPENAPI_TAG_CSRF_EXEMPT = "csrf-exempt" as const;
export const OPENAPI_TAG_EMAIL_VERIFIED = "email-verified" as const;
export const OPENAPI_TAG_MFA_REQUIRED = "mfa-required" as const;
export const OPENAPI_TAG_SITE_ADMIN_ONLY = "site-admin-only" as const;
/** Marks an operation as invocable by the job queue. */
export const OPENAPI_TAG_BACKGROUND = "background" as const;

export const OPENAPI_ENFORCED_TAGS = [
  OPENAPI_TAG_NO_AUTH,
  OPENAPI_TAG_CSRF_EXEMPT,
  OPENAPI_TAG_EMAIL_VERIFIED,
  OPENAPI_TAG_MFA_REQUIRED,
  OPENAPI_TAG_SITE_ADMIN_ONLY,
  OPENAPI_TAG_BACKGROUND,
] as const;

export type OpenApiEnforcedTag = (typeof OPENAPI_ENFORCED_TAGS)[number];

export const OPENAPI_ENFORCED_TAG_SET: ReadonlySet<string> = new Set(
  OPENAPI_ENFORCED_TAGS,
);

export type OpenApiEnforcedTagMeta = {
  tag: OpenApiEnforcedTag;
  /** Short description of the runtime effect. */
  effect: string;
  /** Package that reads this tag. */
  enforcedBy: string;
};

export const OPENAPI_ENFORCED_TAG_CATALOG: readonly OpenApiEnforcedTagMeta[] = [
  {
    tag: OPENAPI_TAG_NO_AUTH,
    effect: "Skip session auth and CSRF on the operation",
    enforcedBy: "@saflib/express (auth + csrf middleware)",
  },
  {
    tag: OPENAPI_TAG_CSRF_EXEMPT,
    effect: "Skip CSRF on unsafe methods (auth still applies unless no-auth)",
    enforcedBy: "@saflib/express (csrf middleware)",
  },
  {
    tag: OPENAPI_TAG_EMAIL_VERIFIED,
    effect: "Require auth.emailVerified (403 otherwise)",
    enforcedBy: "@saflib/express (auth middleware)",
  },
  {
    tag: OPENAPI_TAG_MFA_REQUIRED,
    effect: "Require MFA session when MFA enforcement is enabled",
    enforcedBy: "@saflib/express (auth middleware)",
  },
  {
    tag: OPENAPI_TAG_SITE_ADMIN_ONLY,
    effect: "Require site admin + verified email + MFA",
    enforcedBy: "@saflib/express (auth middleware)",
  },
  {
    tag: OPENAPI_TAG_BACKGROUND,
    effect: "Allow the jobs runtime to invoke this operationId",
    enforcedBy: "@saflib/jobs-http (trigger map / enqueue)",
  },
];

export type OpenApiTagViolation = {
  operationId: string;
  tag: string;
  path?: string;
  method?: string;
};

const HTTP_METHODS = [
  "get",
  "put",
  "post",
  "delete",
  "options",
  "head",
  "patch",
  "trace",
] as const;

type LooseOperation = {
  operationId?: string;
  tags?: string[];
};

type LoosePathItem = Partial<
  Record<(typeof HTTP_METHODS)[number], LooseOperation>
>;

type LooseDocument = {
  paths?: Record<string, LoosePathItem | undefined>;
};

/**
 * Collect unknown operation tags from a bundled (or single-operation) OpenAPI document.
 */
export function findUnknownOpenApiOperationTags(
  apiSpec: LooseDocument,
): OpenApiTagViolation[] {
  const violations: OpenApiTagViolation[] = [];

  for (const [pathTemplate, pathItem] of Object.entries(apiSpec.paths ?? {})) {
    if (!pathItem || typeof pathItem !== "object") {
      continue;
    }
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation || typeof operation !== "object") {
        continue;
      }
      const operationId =
        typeof operation.operationId === "string" && operation.operationId
          ? operation.operationId
          : `${method.toUpperCase()} ${pathTemplate}`;
      for (const tag of operation.tags ?? []) {
        if (!OPENAPI_ENFORCED_TAG_SET.has(tag)) {
          violations.push({
            operationId,
            tag,
            path: pathTemplate,
            method: method.toUpperCase(),
          });
        }
      }
    }
  }

  return violations;
}

/**
 * Throw if any operation uses a tag outside {@link OPENAPI_ENFORCED_TAGS}.
 * Call at startup when loading a product OpenAPI document (and from package tests).
 */
export function assertOpenApiOperationTags(apiSpec: LooseDocument): void {
  const violations = findUnknownOpenApiOperationTags(apiSpec);
  if (violations.length === 0) {
    return;
  }
  const allowed = OPENAPI_ENFORCED_TAGS.join(", ");
  const details = violations
    .map(
      (v) =>
        `  ${v.operationId}${v.method && v.path ? ` (${v.method} ${v.path})` : ""}: unknown tag "${v.tag}"`,
    )
    .join("\n");
  throw new Error(
    `OpenAPI operation tags must be from the enforced allowlist (${allowed}). Grouping tags are not allowed — use the owning package instead.\n${details}`,
  );
}
