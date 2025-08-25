import { metricHistogramDefaultBuckets } from "@saflib/node";
import client from "prom-client";

const grpcMetricName = "grpc_request_duration_seconds";
const grpcMetricHelp =
  "duration histogram of grpc responses labeled with: status_code, grpc_service, method";

// simplified (options-removed) version of express-prom-bundle's makeHttpMetric
// https://github.com/jochen-schweizer/express-prom-bundle/blob/f9a0a7622a398da828c865b2c8a79b42150f6815/src/index.js#L95-L129
export function makeGrpcMetric() {
  const labels = ["service_name", "status_code", "grpc_service", "method"];

  return new client.Histogram({
    name: grpcMetricName,
    help: grpcMetricHelp,
    labelNames: labels,
    buckets: metricHistogramDefaultBuckets,
  });
}

export const grpcMetric = makeGrpcMetric();

export interface GrpcLabels {
  [key: string]: string | number;
  service_name: string;
  status_code: number;
  // unfortunately, "service" is overloaded, so it's prefixed with "grpc_"
  grpc_service: string;
  method: string;
}
