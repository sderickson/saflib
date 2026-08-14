<template>
  <div class="debt-trend">
    <div class="d-flex align-center justify-space-between mb-2">
      <div>
        <h2 class="text-h6 mb-0">Debt over time</h2>
        <p class="text-caption text-medium-emphasis mb-0">
          dead-code + oversized-file + package-layout (newest left)
        </p>
      </div>
      <div class="d-flex ga-3 text-caption">
        <span v-for="s in seriesMeta" :key="s.key" class="d-flex align-center ga-1">
          <span class="swatch" :style="{ background: s.color }" />
          {{ s.label }}
        </span>
      </div>
    </div>
    <svg
      v-if="points.length > 0"
      class="debt-trend__svg"
      :viewBox="`0 0 ${width} ${height}`"
      role="img"
      :aria-label="ariaLabel"
    >
      <line
        v-for="(gy, i) in gridYs"
        :key="`g-${i}`"
        :x1="pad.l"
        :x2="width - pad.r"
        :y1="gy"
        :y2="gy"
        class="debt-trend__grid"
      />
      <polyline
        v-for="s in seriesMeta"
        :key="s.key"
        fill="none"
        :stroke="s.color"
        stroke-width="2"
        stroke-linejoin="round"
        stroke-linecap="round"
        :points="polylineFor(s.key)"
      />
      <text
        v-for="(label, i) in yLabels"
        :key="`y-${i}`"
        :x="pad.l - 6"
        :y="label.y"
        class="debt-trend__axis"
        text-anchor="end"
        dominant-baseline="middle"
      >
        {{ label.text }}
      </text>
    </svg>
    <p v-else class="text-body-2 text-medium-emphasis">
      No debt data yet — scan commits or run
      <code>saf-dev-site scan --recompute-issues</code>.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { CommitSummary } from "@saflib/dev-site-spec";

const props = defineProps<{
  commits: CommitSummary[];
}>();

const width = 720;
const height = 160;
const pad = { t: 12, r: 12, b: 20, l: 36 };

type DebtKind = "dead-code" | "oversized-file" | "package-layout";

const seriesMeta: Array<{ key: DebtKind; label: string; color: string }> = [
  { key: "dead-code", label: "dead-code", color: "#c62828" },
  { key: "oversized-file", label: "oversized", color: "#ef6c00" },
  { key: "package-layout", label: "layout", color: "#6a1b9a" },
];

/** Newest-first commits → chart left-to-right as newest → older. */
const points = computed(() =>
  props.commits.map((c) => ({
    hash: c.hash,
    debt: c.summaryMetrics.debtCount ?? 0,
    kinds: c.summaryMetrics.issueCountsByKind ?? {
      "dead-code": 0,
      "same-file-only-export": 0,
      "oversized-file": 0,
      "package-layout": 0,
    },
  })),
);

const maxY = computed(() => {
  let m = 1;
  for (const p of points.value) {
    for (const s of seriesMeta) {
      m = Math.max(m, p.kinds[s.key] ?? 0);
    }
    m = Math.max(m, p.debt);
  }
  return m;
});

const gridYs = computed(() => {
  const innerH = height - pad.t - pad.b;
  return [0, 0.5, 1].map((t) => pad.t + innerH * (1 - t));
});

const yLabels = computed(() => {
  const innerH = height - pad.t - pad.b;
  return [0, 0.5, 1].map((t) => ({
    y: pad.t + innerH * (1 - t),
    text: String(Math.round(maxY.value * t)),
  }));
});

function xAt(i: number, n: number): number {
  const innerW = width - pad.l - pad.r;
  if (n <= 1) return pad.l + innerW / 2;
  return pad.l + (innerW * i) / (n - 1);
}

function yAt(value: number): number {
  const innerH = height - pad.t - pad.b;
  return pad.t + innerH * (1 - value / maxY.value);
}

function polylineFor(kind: DebtKind): string {
  const n = points.value.length;
  return points.value
    .map((p, i) => `${xAt(i, n)},${yAt(p.kinds[kind] ?? 0)}`)
    .join(" ");
}

const ariaLabel = computed(() => {
  const latest = points.value[0];
  if (!latest) return "Debt trend chart";
  return `Debt trend. Latest debt count ${latest.debt}.`;
});
</script>

<style scoped>
.debt-trend__svg {
  width: 100%;
  max-width: 720px;
  height: auto;
  display: block;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 4px;
}
.debt-trend__grid {
  stroke: rgba(0, 0, 0, 0.08);
  stroke-width: 1;
}
.debt-trend__axis {
  fill: rgba(0, 0, 0, 0.45);
  font-size: 10px;
}
.swatch {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  display: inline-block;
}
</style>
