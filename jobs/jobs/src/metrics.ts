import { metricHistogramDefaultBuckets, getServiceName } from "@saflib/node";
import client from "prom-client";
import type { JobStatus } from "@saflib/jobs-db";

export type JobsDeliveryMetricStatus =
  | "succeeded"
  | "retryable-failure"
  | "dead"
  | "timeout";

export type JobsEnqueuedOutcome = "created" | "deduped" | "rejected";

const deliveryHistogram = new client.Histogram({
  name: "jobs_delivery_duration_seconds",
  help: "Duration of job delivery attempts",
  labelNames: ["service_name", "operation_id", "status"],
  buckets: metricHistogramDefaultBuckets,
});

const enqueuedCounter = new client.Counter({
  name: "jobs_enqueued_total",
  help: "Jobs enqueue outcomes",
  labelNames: ["operation_id", "outcome"],
});

const queueDepthGauge = new client.Gauge({
  name: "jobs_queue_depth",
  help: "Jobs queue depth by status",
  labelNames: ["status"],
});

export interface JobsDeliveryLabels {
  operation_id: string;
  status: JobsDeliveryMetricStatus;
}

/**
 * Start a timer for a delivery attempt; call the returned function with the
 * final status when the attempt completes.
 */
export function startJobsDeliveryTimer(operationId: string): (
  status: JobsDeliveryMetricStatus,
) => void {
  const end = deliveryHistogram.startTimer({
    service_name: getServiceName(),
    operation_id: operationId,
  });
  return (status) => {
    end({ status });
  };
}

export function observeJobsEnqueued(
  operationId: string,
  outcome: JobsEnqueuedOutcome,
): void {
  enqueuedCounter.inc({ operation_id: operationId, outcome });
}

export function setJobsQueueDepth(counts: { status: JobStatus; count: number }[]): void {
  const seen = new Set<string>();
  for (const row of counts) {
    seen.add(row.status);
    queueDepthGauge.set({ status: row.status }, row.count);
  }
  for (const status of [
    "pending",
    "running",
    "retrying",
    "succeeded",
    "dead",
    "cancelled",
  ] as const) {
    if (!seen.has(status)) {
      queueDepthGauge.set({ status }, 0);
    }
  }
}
