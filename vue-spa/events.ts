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
