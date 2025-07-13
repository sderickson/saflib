import { metricHistogramDefaultBuckets } from "@saflib/monorepo";
import client from "prom-client";

const cronMetricName = "cron_job_duration_seconds";
const cronMetricHelp = "duration histogram of cron jobs";

export function makeCronMetric() {
  const labels = ["service_name", "status", "job_name"];

  return new client.Histogram({
    name: cronMetricName,
    help: cronMetricHelp,
    labelNames: labels,
    buckets: metricHistogramDefaultBuckets,
  });
}

export const cronMetric = makeCronMetric();

export interface CronLabels {
  [key: string]: string | number;
  service_name: string;
  status: "success" | "error" | "timeout" | "running";
  job_name: string;
}
