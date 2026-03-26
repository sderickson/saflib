/** Kratos returned HTTP 410 — the self-service flow expired or was already completed. */
export class FlowGone {}

/**
 * Kratos responded with `redirect_browser_to` (e.g. AAL re-auth required, or
 * a browser-location-change after recovery). The caller should redirect to
 * {@link redirectBrowserTo} — that URL comes straight from Kratos.
 */
export class BrowserRedirectRequired {
  constructor(readonly redirectBrowserTo: string) {}
}
