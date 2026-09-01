/** Value substituted for sensitive telemetry fields (cookies, Vue props, etc.). */
export const TELEMETRY_FILTERED_VALUE = "[Filtered]";

/** Cookie names that must never be sent to external telemetry vendors. */
export const TELEMETRY_SENSITIVE_COOKIE_NAMES = new Set([
  "ory_kratos_session",
  "ory_kratos_continuity",
]);

/** Context keys omitted from client error telemetry (may contain PII). */
export const TELEMETRY_OMITTED_CONTEXT_KEYS = new Set([
  "propsData",
  "attrs",
]);

export type TelemetryHttpRequest = {
  cookies?: Record<string, unknown>;
  headers?: Record<string, unknown>;
  data?: unknown;
};

export type TelemetryEventPayload = {
  request?: TelemetryHttpRequest;
  contexts?: Record<string, unknown>;
  extra?: Record<string, unknown>;
};

export function sanitizeTelemetryCookieMap(
  cookies: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!cookies) {
    return cookies;
  }

  let changed = false;
  const next: Record<string, unknown> = { ...cookies };
  for (const name of TELEMETRY_SENSITIVE_COOKIE_NAMES) {
    if (name in next && next[name] !== TELEMETRY_FILTERED_VALUE) {
      next[name] = TELEMETRY_FILTERED_VALUE;
      changed = true;
    }
  }
  return changed ? next : cookies;
}

export function sanitizeTelemetryCookieHeader(
  cookieHeader: string,
): string {
  if (!cookieHeader.trim()) {
    return cookieHeader;
  }

  const parts = cookieHeader.split(";").map((part) => part.trim());
  let changed = false;
  const sanitized = parts.map((part) => {
    const eq = part.indexOf("=");
    if (eq <= 0) {
      return part;
    }
    const name = part.slice(0, eq).trim();
    if (!TELEMETRY_SENSITIVE_COOKIE_NAMES.has(name)) {
      return part;
    }
    changed = true;
    return `${name}=${TELEMETRY_FILTERED_VALUE}`;
  });

  return changed ? sanitized.join("; ") : cookieHeader;
}

export function sanitizeTelemetryHttpRequest(
  request: TelemetryHttpRequest | undefined,
): TelemetryHttpRequest | undefined {
  if (!request) {
    return request;
  }

  const next: TelemetryHttpRequest = { ...request };
  if (request.cookies) {
    next.cookies = sanitizeTelemetryCookieMap(request.cookies);
  }
  if (request.headers && typeof request.headers === "object") {
    const headers = { ...request.headers };
    for (const key of ["cookie", "Cookie"] as const) {
      const value = headers[key];
      if (typeof value === "string") {
        headers[key] = sanitizeTelemetryCookieHeader(value);
      }
    }
    next.headers = headers;
  }
  return next;
}

export function omitTelemetryContextKeys(
  contexts: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!contexts) {
    return contexts;
  }

  let changed = false;
  const next: Record<string, unknown> = { ...contexts };

  for (const [contextName, contextValue] of Object.entries(next)) {
    if (!contextValue || typeof contextValue !== "object") {
      continue;
    }
    const record = contextValue as Record<string, unknown>;
    const sanitized: Record<string, unknown> = { ...record };
    let contextChanged = false;
    for (const key of TELEMETRY_OMITTED_CONTEXT_KEYS) {
      if (key in sanitized) {
        delete sanitized[key];
        contextChanged = true;
      }
    }
    if (contextChanged) {
      next[contextName] = sanitized;
      changed = true;
    }
  }

  return changed ? next : contexts;
}

export function sanitizeTelemetryExtra(
  extra: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!extra) {
    return extra;
  }

  let changed = false;
  const next: Record<string, unknown> = { ...extra };
  for (const key of TELEMETRY_OMITTED_CONTEXT_KEYS) {
    if (key in next) {
      delete next[key];
      changed = true;
    }
  }
  return changed ? next : extra;
}

/** Scrub sensitive HTTP and Vue context fields before forwarding to telemetry vendors. */
export function sanitizeTelemetryEvent<T extends TelemetryEventPayload>(
  event: T,
): T {
  const request = sanitizeTelemetryHttpRequest(event.request);
  const contexts = omitTelemetryContextKeys(event.contexts);
  const extra = sanitizeTelemetryExtra(event.extra);

  if (
    request === event.request &&
    contexts === event.contexts &&
    extra === event.extra
  ) {
    return event;
  }

  return {
    ...event,
    ...(request !== event.request ? { request } : {}),
    ...(contexts !== event.contexts ? { contexts } : {}),
    ...(extra !== event.extra ? { extra } : {}),
  };
}
