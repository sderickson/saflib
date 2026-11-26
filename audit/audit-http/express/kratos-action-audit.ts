import type { DbKey } from "@saflib/drizzle";
import { appendAuditEvent, type AppendAuditEventParams } from "@saflib/audit-db/queries/audit-event/append";
import { errorLogFields, getSafReporters } from "@saflib/node";

/**
 * The parts of a Kratos webhook delivery (`@saflib/ory-kratos-http`'s
 * `KratosAction`) this needs; structural so audit doesn't depend on Kratos.
 */
export interface KratosActionLike {
  body: {
    flow?: { id?: unknown; request_url?: unknown; active?: unknown };
    identity?: { id?: unknown };
    request_headers?: Record<string, string[]>;
  };
  request: { userAgent?: string; acceptLanguage?: string };
}

/** First header value from Kratos's `ctx.request_headers`, case-insensitive. */
function firstFlowHeader(headers: Record<string, string[]> | undefined, ...names: string[]): string | undefined {
  if (!headers) return undefined;
  const byLower = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v] as const));
  for (const name of names) {
    const first = byLower.get(name.toLowerCase())?.[0];
    if (typeof first === "string" && first.length > 0) return first;
  }
  return undefined;
}

/** The end user's IP from the request Kratos captured (not the Kratos→app hop). */
function clientIp(headers: Record<string, string[]> | undefined): string | null {
  const trueClient = firstFlowHeader(headers, "True-Client-Ip");
  if (trueClient) return trueClient.trim();
  const xff = firstFlowHeader(headers, "X-Forwarded-For")?.split(",")[0]?.trim();
  if (xff) return xff;
  return firstFlowHeader(headers, "X-Real-Ip")?.trim() ?? null;
}

/** Which self-service flow a delivery came from. */
export function kratosFlowKind(requestUrl: string): string {
  for (const kind of ["login", "registration", "recovery", "settings", "verification"]) {
    if (requestUrl.includes(`/self-service/${kind}`)) return kind;
  }
  return "selfservice";
}

/**
 * One audit row for a Kratos webhook delivery: sign-ins, sign-ups, recovery
 * and settings changes (password, second factors), with the method, IP and
 * user agent. Event types look like `kratos.login.password.success`.
 *
 * Kratos's `after` hooks only fire when a flow succeeds, so failed sign-in
 * attempts aren't seen here.
 */
export function kratosActionAuditEvent(action: KratosActionLike, now = new Date()): AppendAuditEventParams {
  const { body, request } = action;
  const headers = body.request_headers;
  const flowKind = kratosFlowKind(typeof body.flow?.request_url === "string" ? body.flow.request_url : "");
  const method = typeof body.flow?.active === "string" && body.flow.active ? body.flow.active : "unknown";
  const identityId = typeof body.identity?.id === "string" ? body.identity.id : null;
  const success = identityId !== null;
  const stage = `${flowKind}.${method}.${success ? "success" : "failure"}`;
  return {
    ts: now,
    source: "kratos",
    actor_user_id: identityId,
    on_behalf_of_user_id: null,
    auth_method: "kratos_webhook",
    request_id: firstFlowHeader(headers, "X-Request-ID") ?? "",
    client_ip: clientIp(headers),
    event_type: `kratos.${stage}`,
    resource_type: "user",
    resource_id: identityId,
    outcome: success ? "success" : "denied",
    details: {
      source: "kratos",
      stage,
      flow_id: typeof body.flow?.id === "string" ? body.flow.id : "",
      identity_id: identityId ?? "",
      success,
      methods: method !== "unknown" ? [method] : undefined,
      user_agent: firstFlowHeader(headers, "User-Agent") ?? request.userAgent,
      accept_language: firstFlowHeader(headers, "Accept-Language") ?? request.acceptLanguage,
    },
  };
}

/** Append the delivery's audit row; failures are logged, never thrown (the sign-in already happened). */
export async function recordKratosAction(auditDbKey: DbKey, action: KratosActionLike): Promise<void> {
  try {
    await appendAuditEvent(auditDbKey, kratosActionAuditEvent(action));
  } catch (e) {
    const { log, logError } = getSafReporters();
    log.error("appendAuditEvent failed for kratos action", errorLogFields(e));
    logError(e instanceof Error ? e : new Error(String(e)));
  }
}
