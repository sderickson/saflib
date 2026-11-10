import { promGet, type OpsMetricsConfig } from "../metrics/prometheus.ts";
import type { OsRelease } from "./runtime.ts";

/**
 * The server's OS release from node-exporter's `node_os_info` (host-level,
 * saf_app="host"), through the app's prom-label-proxy. Null when there's no
 * such series (no node-exporter on this host).
 */
export async function hostOsFromPrometheus(config: OpsMetricsConfig): Promise<OsRelease | null> {
  const data = (await promGet(
    config,
    "/api/v1/query",
    new URLSearchParams({ query: 'node_os_info{saf_app="host"}' }),
  )) as { result?: { metric?: Record<string, string> }[] };
  const metric = data.result?.[0]?.metric;
  return metric?.id && metric.version_id ? { id: metric.id, versionId: metric.version_id } : null;
}
