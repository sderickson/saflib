/**
 * Starting points for the Metrics page. `path` is the route template;
 * Docker's healthcheck (`path="unspecified"`) is left out of traffic and
 * availability so it doesn't drown real requests. Windows are [5m]: scrapes
 * are every 60s.
 */
export interface MetricPreset {
  group: string;
  label: string;
  query: string;
  /** How to format values in the table. */
  unit: "count" | "percent" | "seconds" | "bytes" | "ratio";
}

const REQ = 'http_request_duration_seconds_count{path!="unspecified"}';
const BUCKET = 'http_request_duration_seconds_bucket{path!="unspecified"}';

export const METRIC_PRESETS: MetricPreset[] = [
  { group: "Traffic", label: "Requests per minute", query: `sum(rate(${REQ}[5m])) * 60`, unit: "count" },
  { group: "Traffic", label: "Requests per minute by route", query: `sum by (path) (rate(${REQ}[5m])) * 60`, unit: "count" },
  { group: "Availability", label: "Availability (non-5xx %)", query: `100 * (1 - (sum(rate(${REQ.replace("}", ',status_code="5xx"}')}[5m])) or vector(0)) / sum(rate(${REQ}[5m])))`, unit: "percent" },
  { group: "Availability", label: "5xx per minute by route", query: `sum by (path) (rate(${REQ.replace("}", ',status_code="5xx"}')}[5m])) * 60`, unit: "count" },
  { group: "Availability", label: "Responses by status class", query: `sum by (status_code) (rate(${REQ}[5m])) * 60`, unit: "count" },
  { group: "Performance", label: "p95 latency", query: `histogram_quantile(0.95, sum by (le) (rate(${BUCKET}[5m])))`, unit: "seconds" },
  { group: "Performance", label: "p50 latency", query: `histogram_quantile(0.5, sum by (le) (rate(${BUCKET}[5m])))`, unit: "seconds" },
  { group: "Performance", label: "p95 latency by route", query: `histogram_quantile(0.95, sum by (le, path) (rate(${BUCKET}[5m])))`, unit: "seconds" },
  { group: "Database", label: "Query p95", query: "histogram_quantile(0.95, sum by (le) (rate(db_query_duration_seconds_bucket[5m])))", unit: "seconds" },
  { group: "Database", label: "Queries per minute", query: "sum(rate(db_query_duration_seconds_count[5m])) * 60", unit: "count" },
  { group: "Database", label: "Failing queries per minute", query: 'sum(rate(db_query_duration_seconds_count{outcome="error"}[5m])) * 60', unit: "count" },
  { group: "Host", label: "Memory available %", query: "100 * node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes", unit: "percent" },
  { group: "Host", label: "Disk used %", query: '100 * (1 - node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"})', unit: "percent" },
  { group: "Host", label: "CPU used %", query: '100 * (1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m])))', unit: "percent" },
  { group: "Host", label: "Load (1m)", query: "node_load1", unit: "ratio" },
  { group: "Process", label: "Memory (RSS)", query: 'process_resident_memory_bytes{saf_app!="host"}', unit: "bytes" },
  { group: "Process", label: "Event loop lag p99", query: "nodejs_eventloop_lag_p99_seconds", unit: "seconds" },
];

export const METRIC_RANGES = [
  { label: "1h", hours: 1 },
  { label: "6h", hours: 6 },
  { label: "24h", hours: 24 },
  { label: "7d", hours: 168 },
] as const;
