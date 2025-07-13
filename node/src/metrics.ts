import client from "prom-client";
import { getServiceName } from "./context.ts";

const collectDefaultMetrics = client.collectDefaultMetrics;

export function collectSystemMetrics() {
  collectDefaultMetrics({
    labels: {
      service_name: getServiceName(),
    },
  });
}
