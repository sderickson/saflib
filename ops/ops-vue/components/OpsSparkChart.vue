<template>
  <div class="ops-spark" data-test="ops-spark">
    <div class="ops-spark__head">
      <span class="ops-spark__title">{{ title }}</span>
      <span v-if="points.length" class="ops-spark__latest">{{ format(points[points.length - 1]!.v) }}</span>
    </div>
    <!-- One series: an interactive sparkline (hover for time and value),
         drawn at the box's real width so the height stays fixed. -->
    <template v-if="points.length > 1">
      <div class="ops-spark__plot">
        <div class="ops-spark__max" aria-hidden="true">
          <span data-test="ops-spark-max">max {{ format(maxValue) }}</span>
        </div>
        <div ref="box" class="ops-spark__chart" :style="{ height: `${height}px` }">
          <v-sparkline
            :model-value="points.map((p) => p.v)"
            :width="boxWidth || width"
            :height="height"
            :padding="2"
            :min="minValue"
            :line-width="1.5"
            :smooth="4"
            :gradient="gradient"
            gradient-direction="top"
            color="primary"
            fill
            inset
            interactive
            :tooltip="{ titleFormat: tooltipFor, showCrosshair: true }"
            data-test="ops-spark-line"
          />
        </div>
      </div>
      <div v-if="height >= 120" class="ops-spark__axis">
        <span>{{ timeFormat.format(new Date(points[0]!.t * 1000)) }}</span>
        <span>{{ timeFormat.format(new Date(points[points.length - 1]!.t * 1000)) }}</span>
      </div>
    </template>
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
import { computed, onBeforeUnmount, ref, toRef, watch } from "vue";
import { useTheme } from "vuetify";
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
const maxValue = computed(() => Math.max(...points.value.map((p) => p.v)));
// Anchor the area at zero for non-negative metrics, so heights compare honestly.
const minValue = computed(() => Math.min(0, ...points.value.map((p) => p.v)));

const theme = useTheme();
function rgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const n = Number.parseInt(h.length === 3 ? [...h].map((c) => c + c).join("") : h.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
const gradient = computed(() => {
  const primary = String(theme.current.value.colors.primary ?? "#1f2a44");
  return [rgba(primary, 0.35), rgba(primary, 0.03)];
});

const box = ref<HTMLElement | null>(null);
const boxWidth = ref(0);
let observer: ResizeObserver | null = null;
watch(box, (el) => {
  observer?.disconnect();
  if (!el) return;
  boxWidth.value = Math.round(el.clientWidth);
  if (typeof ResizeObserver === "undefined") return;
  observer = new ResizeObserver(([entry]) => {
    boxWidth.value = Math.round(entry!.contentRect.width);
  });
  observer.observe(el);
});
onBeforeUnmount(() => observer?.disconnect());

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
.ops-spark__chart {
  position: relative;
  overflow: hidden;
}
.ops-spark__chart :deep(svg) {
  width: 100%;
  height: 100%;
}
.ops-spark__plot {
  position: relative;
  padding-top: 14px;
}
/* A dashed line at the peak's height (the chart's top), labelled above it. */
.ops-spark__max {
  position: absolute;
  inset: 16px 0 auto 0;
  border-top: 1px dashed rgba(var(--v-theme-on-surface), 0.18);
  pointer-events: none;
}
.ops-spark__max span {
  position: absolute;
  bottom: 2px;
  left: 0;
  font-size: 0.6875rem;
  line-height: 1;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.ops-spark__axis {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  font-size: 0.75rem;
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
