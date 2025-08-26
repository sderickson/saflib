import { useRoute } from "vue-router";

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

let clientName = "unknown";
/**
 * Call when the SPA starts, providing the name of the client. It should be the same as the package name, without the org prefix, so "web-auth" or "web-landing".
 */
export const setClientName = (client: string) => {
  clientName = client;
};

/**
 * Getter for the client name.
 */
export const getClientName = () => {
  return clientName;
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
export const useClientCommon = (componentName: string): ProductEventCommon => {
  const route = useRoute();
  return {
    client: clientName,
    view: route && route.name ? String(route.name) : "unnamed-route",
    component: componentName,
  };
};
