import client from "prom-client";
import { getServiceName } from "./context.ts";

const collectDefaultMetrics = client.collectDefaultMetrics;

/**
 * Call when the application starts. Calls [prom-client](https://www.npmjs.com/package/prom-client)'s collectDefaultMetrics function under the hood.
 */
export function collectSystemMetrics() {
  collectDefaultMetrics({
    labels: {
      service_name: getServiceName(),
    },
  });
}

export const metricHistogramDefaultBuckets = [0.003, 0.03, 0.1, 0.3, 1.5, 10];
