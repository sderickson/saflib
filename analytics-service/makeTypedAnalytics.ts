import type { AnalyticsService, CommonEvent, TypedAnalytics } from "./types.ts";

export function makeTypedAnalytics<E extends CommonEvent>(
  service: AnalyticsService,
): TypedAnalytics<E> {
  return {
    identify: (props) => service.identify(props),
    shutdown: () => service.shutdown(),
    capture: (event: E) => {
      service.capture(event);
    },
  };
}
