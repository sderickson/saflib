import { PostHog } from "posthog-node";
import type {
  AnalyticsService,
  CommonEvent,
  IdentifyProps,
  WithDistinctId,
} from "../types.ts";

export type PosthogAnalyticsServiceOptions = {
  apiKey: string;
  host: string;
};

export class PosthogAnalyticsService implements AnalyticsService {
  private readonly client: PostHog;

  constructor(options: PosthogAnalyticsServiceOptions) {
    this.client = new PostHog(options.apiKey, { host: options.host });
  }

  identify(props: IdentifyProps): void {
    this.client.identify({
      distinctId: props.distinctId,
      properties: props.properties,
      disableGeoip: props.disableGeoip,
    });
  }

  shutdown(): void | Promise<void> {
    return this.client.shutdown();
  }

  capture(event: CommonEvent & WithDistinctId): void {
    this.client.capture({
      distinctId: event.distinctId,
      event: event.event,
      properties: event.context,
    });
  }
}
