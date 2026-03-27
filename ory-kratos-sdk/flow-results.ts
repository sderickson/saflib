import type { GenericError } from "@ory/client";
import type { ErrorBrowserLocationChangeRequired } from "@ory/client";

/** Kratos returned HTTP 410 — the self-service flow expired or was already completed. */
export class FlowGone {
  constructor(readonly error: GenericError) {}
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
