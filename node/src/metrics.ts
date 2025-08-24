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
