import type { GenericError } from "@ory/client";
import type { ErrorBrowserLocationChangeRequired } from "@ory/client";

/** Kratos returned HTTP 410 — the self-service flow expired or was already completed. */
export class FlowGone {
  constructor(readonly error: GenericError) {}
}

/**
 * Kratos returned another HTTP 4xx (not mapped to a dedicated result type yet).
 * Carries the status and parsed `response.data` for debugging or future handling.
 */
export class UnhandledResponse {
  constructor(
    readonly status: number,
    readonly data: unknown,
  ) {}
}

/**
 * Kratos responded with `redirect_browser_to` (e.g. AAL re-auth required, or
 * a browser-location-change after recovery). The caller should redirect to
 * `payload.redirect_browser_to` — that URL comes straight from Kratos.
 */
export class BrowserRedirectRequired {
  constructor(readonly payload: ErrorBrowserLocationChangeRequired) {}
}

export class SessionAlreadyAvailable {
  constructor(readonly error: GenericError) {}
}
