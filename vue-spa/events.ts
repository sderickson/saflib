import { useRoute } from "vue-router";

type ProductEventListener<T> = (event: T) => void;

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
    emitProductEvent: (event: T) => {
      eventListeners.forEach((listener) => listener(event));
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

type ProductEventCommon = {
  /** @description The frontend client that triggered the event. For web, it should be "web-{spa-name}". */
  client: string;
  /** @description The page that triggered the event. For vue, it should be the route name provided by vue router. */
  view: string;
  /** @description The component that triggered the event. For vue, it should be the component name. */
  component: string;
};

export const useClientCommon = (componentName: string): ProductEventCommon => {
  const route = useRoute();
  return {
    client: clientName,
    view: route.name ? String(route.name) : "unnamed-route",
    component: componentName,
  };
};
