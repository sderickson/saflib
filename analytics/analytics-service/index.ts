export type {
  AnalyticsService,
  CommonEvent,
  IdentifyProps,
  TypedAnalytics,
} from "./types.ts";
export { AnalyticsServiceBase } from "./AnalyticsServiceBase.ts";
export {
  setAnalyticsConsentResolver,
  hasAnalyticsConsent,
  type AnalyticsConsentResolver,
} from "./consent.ts";
export { makeTypedAnalytics } from "./makeTypedAnalytics.ts";
export {
  createAnalyticsService,
  type CreateAnalyticsServiceOptions,
} from "./createAnalyticsService.ts";
export {
  setAnalyticsClient,
  getAnalyticsClient,
  hasAnalyticsClient,
  resetAnalyticsForTests,
} from "./configureAnalytics.ts";
export {
  InMemoryAnalyticsService,
  capturedAnalyticsCalls,
  clearCapturedAnalyticsCalls,
  type CapturedAnalyticsCall,
} from "./in-memory/InMemoryAnalyticsService.ts";
