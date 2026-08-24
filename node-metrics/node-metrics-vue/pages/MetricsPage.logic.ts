import type { MetricSnapshot } from "@saflib/node-metrics-spec";

export function metricLabelKey(labels: Record<string, string>): string {
  return Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join(",");
}

export function uniqueMetricNames(metrics: MetricSnapshot[]): string[] {
  return [...new Set(metrics.map((m) => m.name))].sort();
}

export function uniqueLabelKeys(metrics: MetricSnapshot[]): string[] {
  const keys = new Set<string>();
  for (const metric of metrics) {
    for (const key of Object.keys(metric.labels)) {
      keys.add(key);
    }
  }
  return [...keys].sort();
}

export interface MetricFilter {
  labelKey: string;
  labelValue: string;
}

export function filterMetrics(
  metrics: MetricSnapshot[],
  selectedName: string | null,
  filters: MetricFilter[],
): MetricSnapshot[] {
  return metrics.filter((metric) => {
    if (selectedName && metric.name !== selectedName) return false;
    for (const filter of filters) {
      if (!filter.labelKey || !filter.labelValue) continue;
      if (metric.labels[filter.labelKey] !== filter.labelValue) return false;
    }
    return true;
  });
}

export interface MetricGroup {
  groupLabel: string;
  metrics: MetricSnapshot[];
}

export function groupMetricsByLabel(
  metrics: MetricSnapshot[],
  splitLabel: string | null,
): MetricGroup[] {
  if (!splitLabel) {
    return [{ groupLabel: "All", metrics }];
  }

  const groups = new Map<string, MetricSnapshot[]>();
  for (const metric of metrics) {
    const groupLabel = metric.labels[splitLabel] ?? "(missing)";
    const bucket = groups.get(groupLabel) ?? [];
    bucket.push(metric);
    groups.set(groupLabel, bucket);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([groupLabel, groupMetrics]) => ({ groupLabel, metrics: groupMetrics }));
}

export function formatMetricValue(metric: MetricSnapshot): string {
  if (metric.type === "histogram") {
    const count = metric.count ?? 0;
    const sum = metric.sum ?? 0;
    return `count=${count}, sum=${sum}`;
  }
  return String(metric.value ?? "");
}
