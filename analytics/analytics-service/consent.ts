/**
 * Whether a user has agreed to product analytics. Products whose users opt in
 * (or out) register a resolver; without one, every user counts as consented,
 * which keeps products that don't ask behaving as before.
 *
 * Must answer synchronously, because `capture` is synchronous. A product
 * typically loads the user's preference once per request (in middleware) and
 * reads it back here.
 */
export type AnalyticsConsentResolver = (userId: string) => boolean;

let consentResolver: AnalyticsConsentResolver | undefined;

/** Registers the consent check used by `AnalyticsServiceBase.capture`. Later calls replace it. */
export function setAnalyticsConsentResolver(
  resolver: AnalyticsConsentResolver | undefined,
): void {
  consentResolver = resolver;
}

/** True when there's no resolver, or it says this user agreed. */
export function hasAnalyticsConsent(userId: string): boolean {
  return consentResolver ? consentResolver(userId) === true : true;
}
