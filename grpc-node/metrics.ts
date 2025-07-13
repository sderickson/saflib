const grpcMetricName = "grpc_request_duration_seconds";
const grpcMetricHelp =
  "duration histogram of grpc responses labeled with: status_code, grpc_service, grpc_method";
import client from "prom-client";

// simplified (options-removed) version of express-prom-bundle's makeHttpMetric
// https://github.com/jochen-schweizer/express-prom-bundle/blob/f9a0a7622a398da828c865b2c8a79b42150f6815/src/index.js#L95-L129
export function makeGrpcMetric() {
  const labels = ["status_code", "grpc_service", "grpc_method"];

  return new client.Histogram({
    name: grpcMetricName,
    help: grpcMetricHelp,
    labelNames: labels,
    buckets: [0.003, 0.03, 0.1, 0.3, 1.5, 10],
  });
}

export const grpcMetric = makeGrpcMetric();
