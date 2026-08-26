import { inject, type InjectionKey } from "vue";
import { useListProductEvents } from "@saflib/analytics-sdk";

export type ProductEventsLoader = {
  productEventsQuery: ReturnType<typeof useListProductEvents>;
};

export function useProductEventsLoader(): ProductEventsLoader {
  return {
    productEventsQuery: useListProductEvents(),
  };
}

export const productEventsLoaderKey: InjectionKey<ProductEventsLoader> =
  Symbol("productEventsLoader");

export function useProductEventsPageLoader(): ProductEventsLoader {
  return inject(productEventsLoaderKey, null) ?? useProductEventsLoader();
}
