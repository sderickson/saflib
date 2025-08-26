import { useRoute } from "vue-router";

export type ProductEventListener<T> = (event: T) => void;

/*
  Provide a product event type to ensure type safety.
  Recommended: generate product events as part of the API spec.
*/
export const makeProductEventLogger = <T>() => {
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
export const setClientName = (client: string) => {
  clientName = client;
};

export const getClientName = () => {
  return clientName;
};

export type ProductEventCommon = {
  /** The frontend client that triggered the event. For web, it should be "web-{spa-name}". */
  client: string;
  /** The page that triggered the event. For vue, it should be the route name provided by vue router. */
  view: string;
  /** The component that triggered the event. For vue, it should be the component name. */
  component: string;
};

export const useClientCommon = (componentName: string): ProductEventCommon => {
  const route = useRoute();
  return {
    client: clientName,
    view: route && route.name ? String(route.name) : "unnamed-route",
    component: componentName,
  };
};
