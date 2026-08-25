import { inject, type InjectionKey } from "vue";
import { useListProductEvents } from "@saflib/analytics-sdk";

export function useProductEventsLoader() {
  return {
    productEventsQuery: useListProductEvents(),
  };
}

export type ProductEventsLoader = ReturnType<typeof useProductEventsLoader>;

export const productEventsLoaderKey: InjectionKey<ProductEventsLoader> =
  Symbol("productEventsLoader");

export function useProductEventsPageLoader(): ProductEventsLoader {
  return inject(productEventsLoaderKey, null) ?? useProductEventsLoader();
}
