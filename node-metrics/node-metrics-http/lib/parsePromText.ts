import type { MetricSnapshot } from "@saflib/node-metrics-spec";

type MetricType = MetricSnapshot["type"];

interface RawSample {
  name: string;
  labels: Record<string, string>;
  value: number;
}

function parseLabels(raw: string): Record<string, string> {
  const labels: Record<string, string> = {};
  if (!raw.trim()) return labels;

  const labelPattern = /([a-zA-Z_][a-zA-Z0-9_]*)="((?:\\.|[^"\\])*)"/g;
  let match: RegExpExecArray | null;
  while ((match = labelPattern.exec(raw)) !== null) {
    labels[match[1]] = match[2].replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  return labels;
}

function parseMetricLine(line: string): RawSample | undefined {
  const match = line.match(
    /^([a-zA-Z_:][a-zA-Z0-9_:]*)(\{([^}]*)\})?\s+([-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?|NaN|\+Inf|-Inf)(?:\s+\d+)?$/,
  );
  if (!match) return undefined;

  const valueRaw = match[4];
  const value =
    valueRaw === "NaN"
      ? Number.NaN
      : valueRaw === "+Inf"
        ? Number.POSITIVE_INFINITY
        : valueRaw === "-Inf"
          ? Number.NEGATIVE_INFINITY
          : Number(valueRaw);

  return {
    name: match[1],
    labels: parseLabels(match[3] ?? ""),
    value,
  };
}

function histogramBaseName(name: string): string | undefined {
  if (name.endsWith("_bucket")) return name.slice(0, -"_bucket".length);
  if (name.endsWith("_sum")) return name.slice(0, -"_sum".length);
  if (name.endsWith("_count")) return name.slice(0, -"_count".length);
  return undefined;
}

function labelsKey(labels: Record<string, string>): string {
  return Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join(",");
}

function histogramGroupKey(name: string, labels: Record<string, string>): string {
  const { le: _le, ...rest } = labels;
  return `${name}|${labelsKey(rest)}`;
}

/**
 * Parse Prometheus text exposition into normalized metric snapshots.
 */
export function parsePromText(text: string): MetricSnapshot[] {
  const helpByName = new Map<string, string>();
  const typeByName = new Map<string, MetricType>();
  const samples: RawSample[] = [];

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("#")) {
      const helpMatch = trimmed.match(/^# HELP (\S+)\s+(.*)$/);
      if (helpMatch) {
        helpByName.set(helpMatch[1], helpMatch[2]);
      }
      const typeMatch = trimmed.match(/^# TYPE (\S+)\s+(\S+)/);
      if (typeMatch && typeMatch[2] !== "untyped") {
        typeByName.set(typeMatch[1], typeMatch[2] as MetricType);
      }
      continue;
    }

    const sample = parseMetricLine(trimmed);
    if (sample) samples.push(sample);
  }

  const countersAndGauges: MetricSnapshot[] = [];
  const histograms = new Map<
    string,
    {
      name: string;
      labels: Record<string, string>;
      buckets: Array<{ le: string; count: number }>;
      sum?: number;
      count?: number;
    }
  >();

  for (const sample of samples) {
    const histBase = histogramBaseName(sample.name);
    if (histBase !== undefined) {
      const groupKey = histogramGroupKey(histBase, sample.labels);
      let entry = histograms.get(groupKey);
      if (!entry) {
        const { le: _le, ...rest } = sample.labels;
        entry = { name: histBase, labels: rest, buckets: [] };
        histograms.set(groupKey, entry);
      }

      if (sample.name.endsWith("_bucket")) {
        const le = sample.labels.le ?? "+Inf";
        entry.buckets.push({ le, count: sample.value });
      } else if (sample.name.endsWith("_sum")) {
        entry.sum = sample.value;
      } else if (sample.name.endsWith("_count")) {
        entry.count = sample.value;
      }
      continue;
    }

    const metricType = typeByName.get(sample.name) ?? "gauge";
    if (metricType === "histogram") {
      continue;
    }

    countersAndGauges.push({
      name: sample.name,
      type: metricType,
      help: helpByName.get(sample.name),
      labels: sample.labels,
      value: sample.value,
    });
  }

  const histogramMetrics: MetricSnapshot[] = [...histograms.values()].map(
    (entry) => ({
      name: entry.name,
      type: "histogram" as const,
      help: helpByName.get(entry.name),
      labels: entry.labels,
      buckets: entry.buckets.sort((a, b) => {
        if (a.le === "+Inf") return 1;
        if (b.le === "+Inf") return -1;
        return Number(a.le) - Number(b.le);
      }),
      sum: entry.sum,
      count: entry.count,
    }),
  );

  return [...countersAndGauges, ...histogramMetrics].sort((a, b) => {
    const nameCmp = a.name.localeCompare(b.name);
    if (nameCmp !== 0) return nameCmp;
    return labelsKey(a.labels).localeCompare(labelsKey(b.labels));
  });
}
