<template>
  <div class="ops-spark" data-test="ops-spark">
    <div class="ops-spark__head">
      <span class="ops-spark__title">{{ title }}</span>
      <span v-if="points.length" class="ops-spark__latest">{{ format(points[points.length - 1]!.v) }}</span>
    </div>
    <!-- One series: an interactive sparkline (hover for time and value). -->
    <v-sparkline
      v-if="points.length > 1"
      :model-value="points.map((p) => p.v)"
      :height="height"
      :line-width="1.5"
      :smooth="4"
      color="primary"
      fill
      interactive
      :tooltip="{ titleFormat: tooltipFor, showCrosshair: true }"
      auto-draw
      data-test="ops-spark-line"
    />
    <!-- Several series (e.g. by route) or no data yet: the rendered graph. -->
    <OpsGraph v-else-if="fallback" :query="query" :title="title" :hours="hours" :width="width" :height="height" />
    <div v-else class="ops-spark__empty">{{ range.isPending.value ? "…" : "No data yet" }}</div>
  </div>
</template>

<script setup lang="ts">
/**
 * A metric over time from PromQL. Single-series queries render as an
 * interactive sparkline (hover shows the time and value); anything else
 * falls back to the server-rendered graph image, which stays the format
 * for reports and agents.
 */
import { computed, toRef } from "vue";
import { useOpsMetricsRange } from "../requests/queries.ts";
import OpsGraph from "./OpsGraph.vue";

export type SparkUnit = "count" | "percent" | "seconds" | "bytes" | "ratio";

const props = withDefaults(
  defineProps<{ query: string; title: string; hours?: number; unit?: SparkUnit; width?: number; height?: number }>(),
  { hours: 24, unit: "count", width: 420, height: 80 },
);

const range = useOpsMetricsRange(toRef(props, "query"), toRef(props, "hours"));

type Point = { t: number; v: number };
const series = computed(() => (range.data.value?.metrics.result ?? []) as { values?: [number, string][] }[]);
const points = computed<Point[]>(() => {
  if (series.value.length !== 1) return [];
  return (series.value[0]!.values ?? [])
    .map(([t, v]) => ({ t: Number(t), v: Number(v) }))
    .filter((p) => Number.isFinite(p.v));
});
const fallback = computed(() => range.isSuccess.value && series.value.length > 1);

function format(v: number): string {
  switch (props.unit) {
    case "percent":
      return `${v.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
    case "seconds":
      return v >= 1 ? `${v.toLocaleString(undefined, { maximumFractionDigits: 2 })} s` : `${Math.round(v * 1000)} ms`;
    case "bytes": {
      const units = ["B", "KB", "MB", "GB", "TB"];
      let n = v;
      let i = 0;
      while (n >= 1024 && i < units.length - 1) {
        n /= 1024;
        i++;
      }
      return `${n.toLocaleString(undefined, { maximumSignificantDigits: 3 })} ${units[i]}`;
    }
    default:
      return v.toLocaleString(undefined, { maximumFractionDigits: v < 10 ? 2 : 0 });
  }
}

const timeFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
function tooltipFor({ index, value }: { index: number; value: number }): string {
  const p = points.value[index];
  return p ? `${timeFormat.format(new Date(p.t * 1000))} · ${format(value)}` : format(value);
}
</script>

<style scoped>
.ops-spark__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}
.ops-spark__title {
  font-size: 0.8125rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.ops-spark__latest {
  font-weight: 600;
}
.ops-spark__empty {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8125rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
</style>
