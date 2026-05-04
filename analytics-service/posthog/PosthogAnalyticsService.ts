import { PostHog } from "posthog-node";
import { AnalyticsServiceBase } from "../AnalyticsServiceBase.ts";
import type { IdentifyProps } from "../types.ts";

export type PosthogAnalyticsServiceOptions = {
  apiKey: string;
  host: string;
};

export class PosthogAnalyticsService extends AnalyticsServiceBase {
  private readonly client: PostHog;

  constructor(options: PosthogAnalyticsServiceOptions) {
    super();
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

  protected emitCapture(event: {
    distinctId: string;
    event: string;
    context?: Record<string, unknown>;
  }): void {
    this.client.capture({
      distinctId: event.distinctId,
      event: event.event,
      properties: event.context,
    });
  }
}
