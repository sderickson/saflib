import { useRoute } from "vue-router";
import { getClientName } from "../../links/utils.ts";
import { ref } from "vue";
import { isTestEnv } from "./wip-env.ts";
import { isTestMode } from "./test-mode.ts";
/**
 * A function that receives product events as they're emitted.
 */
export type ProductEventListener<T> = (event: T) => void;

/**
 * Create centralized object to emit and listen to product events. Provide a product event type to ensure type safety, produced as part of the API spec.
 *
 * @example
 * ```ts
 * import type { ProductEvent } from "@your-org/service-spec"; // package using @saflib/openapi
 * const { onProductEvent, emitProductEvent } = makeProductEventLogger<ProductEvent>();
 * ```
 */
export const makeProductEventLogger = <T extends ProductEventCommon>() => {
  const eventListeners: ProductEventListener<T>[] = [];

  return {
    onProductEvent: (listener: ProductEventListener<T>) => {
      eventListeners.push(listener);
    },
    emitProductEvent: async (event: T) => {
      eventListeners.forEach((listener) => listener(event));
      // if you are about to navigate, await the promise to increase the chance that the event is logged
      return new Promise((resolve) => setTimeout(resolve, 100));
    },
  };
};

/**
 * Common fields for all product events.
 */
export type ProductEventCommon = {
  /** The frontend client that triggered the event. For web, it should be "web-{spa-name}". */
  client?: string;
  /** The page that triggered the event. For vue, it should be the route name provided by vue router. */
  view?: string;
  /** The component that triggered the event. For vue, it should be the component name. */
  component?: string;
  /** The event name. */
  event: string;
  /** The context for the event. */
  context?: Record<string, unknown>;
};

/**
 * Get the common context for a product event.
 *
 * Usage:
 * ```ts
 * const { onProductEvent, emitProductEvent } = makeProductEventLogger<ProductEvent>();
 * emitProductEvent({ ...useClientCommon("MyComponent"), event: "my-event" });
 * ```
 */
export const useClientCommon = (
  componentName: string,
): Omit<ProductEventCommon, "event" | "context"> => {
  const route = useRoute();
  return {
    client: getClientName(),
    view: route && route.name ? String(route.name) : "unnamed-route",
    component: componentName,
  };
};

export const getEvents = (): string[] => {
  if (isTestEnv()) {
    return [];
  }
  const eventCookie =
    document.cookie.split(";").find((c) => c.trim().startsWith("events=")) ||
    "";
  const events = eventCookie ? eventCookie.split("=")[1].split(",") : [];
  return events;
};

export const events = ref<string[]>(getEvents());

export const pushEvent = <T extends ProductEventCommon>(event: T) => {
  const eventSet = new Set(getEvents());
  eventSet.add(event.event);
  document.cookie = `events=${Array.from(eventSet).join(",")}; domain=.docker.localhost`;
  events.value.push(event.event);
};

const group = (...args: Parameters<typeof console.group>) => {
  if (isTestEnv()) {
    return;
  } else {
    console.group(...args);
  }
};
const groupEnd = (...args: Parameters<typeof console.groupEnd>) => {
  if (isTestEnv()) {
    return;
  } else {
    console.groupEnd(...args);
  }
};
const log = (...args: Parameters<typeof console.log>) => {
  if (isTestEnv()) {
    return;
  } else {
    console.log(...args);
  }
};

type objectOrString = object | string;
interface GlobalThis extends Window {
  gtag: (...args: objectOrString[]) => void;
}

export const commonEventLogger = <T extends ProductEventCommon>(event: T) => {
  group("Event logged:", event.event);
  if (
    "gtag" in globalThis &&
    (globalThis as unknown as GlobalThis).gtag !== undefined
  ) {
    // @ts-expect-error - gtag is not typed
    globalThis.gtag("event", event.event, event.context);
    log("- to gtag");
  }

  if ("dataLayer" in globalThis) {
    // @ts-expect-error - dataLayer is not typed
    globalThis.dataLayer.push(event);
    log("- to dataLayer");
  }

  if ("posthog" in globalThis) {
    // @ts-expect-error - posthog is not typed
    globalThis.posthog.capture(event.event, event.context);
    log("- to posthog");
  }

  if ("fbq" in globalThis) {
    // @ts-expect-error - fbq is not typed
    globalThis.fbq("trackCustom", event.event, event.context);
    log("- to fbq");
  }

  if (isTestMode()) {
    log("- to events array");
    pushEvent(event);
  }

  if ("context" in event && event.context) {
    group("Context");
    for (const [key, value] of Object.entries(event.context)) {
      log(`${key}: ${JSON.stringify(value)}`);
    }
    groupEnd();
  }

  groupEnd();
};
