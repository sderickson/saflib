import { inject, type InjectionKey } from "vue";
import { useGetMetricsSnapshot } from "@saflib/node-metrics-sdk";

export type MetricsLoader = {
  metricsQuery: ReturnType<typeof useGetMetricsSnapshot>;
};

export function useMetricsLoader(): MetricsLoader {
  return {
    metricsQuery: useGetMetricsSnapshot(),
  };
}

export const metricsLoaderKey: InjectionKey<MetricsLoader> =
  Symbol("metricsLoader");

export function useMetricsPageLoader(): MetricsLoader {
  return inject(metricsLoaderKey, null) ?? useMetricsLoader();
}
