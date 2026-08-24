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

/** Label keys present on series for the selected metric name. */
export function labelKeysForMetric(
  metrics: MetricSnapshot[],
  selectedName: string,
): string[] {
  const keys = new Set<string>();
  for (const metric of metrics) {
    if (metric.name !== selectedName) continue;
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

export function labelValueMatchesFilter(
  labelValue: string | undefined,
  query: string,
): boolean {
  if (!query) return true;
  if (labelValue === undefined) return false;
  return labelValue.toLowerCase().includes(query.trim().toLowerCase());
}

export function filterMetrics(
  metrics: MetricSnapshot[],
  selectedName: string | null,
  filters: MetricFilter[],
): MetricSnapshot[] {
  return metrics.filter((metric) => {
    if (selectedName && metric.name !== selectedName) return false;
    if (!selectedName) return true;
    for (const filter of filters) {
      if (!filter.labelKey || !filter.labelValue?.trim()) continue;
      if (
        !labelValueMatchesFilter(
          metric.labels[filter.labelKey],
          filter.labelValue,
        )
      ) {
        return false;
      }
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

export interface LabelValueRow {
  key: string;
  values: string;
}

/** One row per label key; values are comma-separated across the series set. */
export function labelValueRows(metrics: MetricSnapshot[]): LabelValueRow[] {
  const keys = new Set<string>();
  for (const metric of metrics) {
    for (const key of Object.keys(metric.labels)) {
      keys.add(key);
    }
  }

  return [...keys].sort().map((key) => {
    const values = [
      ...new Set(
        metrics
          .map((m) => m.labels[key])
          .filter((v): v is string => v !== undefined && v !== ""),
      ),
    ].sort();
    return { key, values: values.length > 0 ? values.join(", ") : "—" };
  });
}

export interface MetricDisplayRow {
  key: string;
  name: string;
  type: MetricSnapshot["type"];
  series: MetricSnapshot[];
}

export interface MetricDisplayGroup {
  groupLabel: string | null;
  rows: MetricDisplayRow[];
}

/**
 * One aggregated row per metric name; split breaks into groups that each aggregate.
 */
export function buildMetricDisplayGroups(
  metrics: MetricSnapshot[],
  selectedName: string | null,
  splitLabel: string | null,
): MetricDisplayGroup[] {
  const scoped = selectedName
    ? metrics.filter((m) => m.name === selectedName)
    : metrics;

  if (!splitLabel) {
    const byName = new Map<string, MetricSnapshot[]>();
    for (const metric of scoped) {
      const groupKey = `${metric.name}\0${metric.type}`;
      const bucket = byName.get(groupKey) ?? [];
      bucket.push(metric);
      byName.set(groupKey, bucket);
    }

    return [
      {
        groupLabel: null,
        rows: [...byName.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([groupKey, series]) => {
            const first = series[0]!;
            return {
              key: groupKey,
              name: first.name,
              type: first.type,
              series,
            };
          }),
      },
    ];
  }

  return groupMetricsByLabel(scoped, splitLabel).map((group) => {
    const first = group.metrics[0]!;
    return {
      groupLabel: group.groupLabel,
      rows: [
        {
          key: `${first.name}\0${first.type}\0${group.groupLabel}`,
          name: first.name,
          type: first.type,
          series: group.metrics,
        },
      ],
    };
  });
}

export function formatMetricValue(metric: MetricSnapshot): string {
  if (metric.type === "histogram") {
    const count = metric.count ?? 0;
    const sum = metric.sum ?? 0;
    return `count=${count}, sum=${formatNumber(sum)}`;
  }
  return String(metric.value ?? "");
}

/** Sum scalar values or merge histogram buckets/count/sum across series. */
export function aggregateMetricSeries(
  series: MetricSnapshot[],
): MetricSnapshot {
  const first = series[0]!;
  if (series.length === 1) {
    return first;
  }

  if (first.type === "histogram") {
    const count = series.reduce((n, m) => n + (m.count ?? 0), 0);
    const sum = series.reduce((n, m) => n + (m.sum ?? 0), 0);
    const bucketTotals = new Map<string, number>();
    for (const metric of series) {
      for (const bucket of metric.buckets ?? []) {
        bucketTotals.set(
          bucket.le,
          (bucketTotals.get(bucket.le) ?? 0) + bucket.count,
        );
      }
    }
    return {
      name: first.name,
      type: "histogram",
      labels: first.labels,
      count,
      sum,
      buckets: [...bucketTotals.entries()]
        .map(([le, bucketCount]) => ({ le, count: bucketCount }))
        .sort((a, b) => compareLe(a.le, b.le)),
    };
  }

  const value = series.reduce((n, m) => n + (m.value ?? 0), 0);
  return {
    name: first.name,
    type: first.type,
    labels: first.labels,
    value,
  };
}

export function formatAggregatedValue(series: MetricSnapshot[]): string {
  const aggregated = aggregateMetricSeries(series);
  if (aggregated.type === "histogram") {
    return formatMetricValue(aggregated);
  }
  return formatNumber(aggregated.value ?? 0);
}

export type HistogramBucket = NonNullable<MetricSnapshot["buckets"]>[number];

export function sortedHistogramBuckets(
  buckets: MetricSnapshot["buckets"],
): HistogramBucket[] {
  if (!buckets?.length) return [];
  return [...buckets].sort((a, b) => compareLe(a.le, b.le));
}

function compareLe(a: string, b: string): number {
  if (a === "+Inf") return 1;
  if (b === "+Inf") return -1;
  return parseFloat(a) - parseFloat(b);
}

export function histogramStatsText(metric: MetricSnapshot): string {
  const count = metric.count ?? 0;
  const sum = metric.sum ?? 0;
  const mean = count > 0 ? sum / count : 0;
  const parts = [
    `count=${count}`,
    `sum=${formatNumber(sum)}`,
    `mean=${formatNumber(mean)}`,
  ];

  const buckets = sortedHistogramBuckets(metric.buckets);
  if (buckets.length > 0 && count > 0) {
    const maxLe = buckets.findLast((b) => b.le !== "+Inf")?.le;
    if (maxLe !== undefined) {
      parts.push(`max bucket ≤ ${maxLe}`);
    }
  }

  return parts.join(" · ");
}

function formatNumber(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(4).replace(/\.?0+$/, "");
}
