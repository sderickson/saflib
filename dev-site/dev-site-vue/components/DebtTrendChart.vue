<template>
  <div class="debt-trend">
    <div class="d-flex align-center justify-space-between mb-2 flex-wrap ga-2">
      <div>
        <h2 class="text-h6 mb-0">Debt over time</h2>
        <p class="text-caption text-medium-emphasis mb-0">
          {{ subtitle }}
        </p>
      </div>
      <div class="d-flex ga-3 text-caption flex-wrap">
        <span
          v-for="s in seriesMeta"
          :key="s.key"
          class="d-flex align-center ga-1"
        >
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
      <!-- Branch segment bands -->
      <g v-for="(seg, i) in segmentBands" :key="`band-${i}`">
        <rect
          :x="seg.x"
          :y="pad.t"
          :width="Math.max(seg.width, 0)"
          :height="plotH"
          :fill="seg.fill"
          opacity="0.35"
        />
        <text
          v-if="seg.width > 48"
          :x="seg.x + seg.width / 2"
          :y="pad.t + 12"
          class="debt-trend__branch"
          text-anchor="middle"
        >
          {{ seg.branch }}
        </text>
      </g>

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

      <text
        v-for="(label, i) in xLabels"
        :key="`x-${i}`"
        :x="label.x"
        :y="height - 6"
        class="debt-trend__axis"
        text-anchor="middle"
      >
        {{ label.text }}
      </text>
    </svg>
    <p v-else class="text-body-2 text-medium-emphasis">
      {{ emptyMessage }}
    </p>
    <div
      v-if="segments.length > 1"
      class="d-flex ga-3 text-caption mt-2 flex-wrap"
    >
      <span
        v-for="(seg, i) in segments"
        :key="`leg-${i}`"
        class="d-flex align-center ga-1"
      >
        <span
          class="swatch"
          :style="{ background: branchFill(seg.branch, i) }"
        />
        {{ seg.branch }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { CommitSummary } from "@saflib/dev-site-spec";
import {
  buildDebtTrendSeries,
  type DebtKind,
} from "../debt-trend-series.ts";

const props = withDefaults(
  defineProps<{
    commits: CommitSummary[];
    headHash?: string | null;
    currentBranch?: string | null;
    mainBranch?: string;
  }>(),
  {
    headHash: null,
    currentBranch: null,
    mainBranch: "main",
  },
);

const width = 720;
const height = 200;
const pad = { t: 28, r: 12, b: 28, l: 36 };
const plotH = height - pad.t - pad.b;

const seriesMeta: Array<{ key: DebtKind; label: string; color: string }> = [
  { key: "dead-code", label: "dead-code", color: "#c62828" },
  { key: "oversized-file", label: "oversized", color: "#ef6c00" },
  { key: "package-layout", label: "layout", color: "#6a1b9a" },
];

const BRANCH_FILLS = ["#bbdefb", "#c8e6c9", "#ffe0b2", "#e1bee7", "#b2ebf2"];

function branchFill(branch: string, index: number): string {
  if (branch === props.mainBranch) return "#cfd8dc";
  return BRANCH_FILLS[index % BRANCH_FILLS.length]!;
}

const series = computed(() =>
  buildDebtTrendSeries({
    commits: props.commits,
    headHash: props.headHash,
    currentBranch: props.currentBranch,
    mainBranch: props.mainBranch,
  }),
);

const points = computed(() => series.value.points);
const segments = computed(() => series.value.segments);

const subtitle = computed(() => {
  const branch = props.currentBranch || "HEAD";
  return `${branch} first-parent ancestry · oldest left · issue-stats commits only`;
});

const emptyMessage = computed(() => {
  if (!props.headHash) {
    return "Waiting for checkout…";
  }
  if (!props.commits.some((c) => c.summary_metrics.has_issue_stats)) {
    return "No debt data yet — scan commits or run saf-dev-site scan --recompute-issues.";
  }
  return "No issue-stats commits on the current branch ancestry yet. Scan this checkout or recompute issues.";
});

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
  return [0, 0.5, 1].map((t) => pad.t + plotH * (1 - t));
});

const yLabels = computed(() => {
  return [0, 0.5, 1].map((t) => ({
    y: pad.t + plotH * (1 - t),
    text: String(Math.round(maxY.value * t)),
  }));
});

function xAt(i: number, n: number): number {
  const innerW = width - pad.l - pad.r;
  if (n <= 1) return pad.l + innerW / 2;
  return pad.l + (innerW * i) / (n - 1);
}

function yAt(value: number): number {
  return pad.t + plotH * (1 - value / maxY.value);
}

function polylineFor(kind: DebtKind): string {
  const n = points.value.length;
  return points.value
    .map((p, i) => `${xAt(i, n)},${yAt(p.kinds[kind] ?? 0)}`)
    .join(" ");
}

const segmentBands = computed(() => {
  const n = points.value.length;
  return segments.value.map((seg, i) => {
    const x0 = xAt(seg.startIndex, n);
    const x1 = xAt(seg.endIndex, n);
    const left = Math.min(x0, x1);
    const right = Math.max(x0, x1);
    // Expand half-step so bands touch between points
    const half =
      n <= 1 ? (width - pad.l - pad.r) / 2 : (width - pad.l - pad.r) / (n - 1) / 2;
    const x = Math.max(pad.l, left - half);
    const xEnd = Math.min(width - pad.r, right + half);
    return {
      branch: seg.branch,
      x,
      width: xEnd - x,
      fill: branchFill(seg.branch, i),
    };
  });
});

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

const xLabels = computed(() => {
  const pts = points.value;
  const n = pts.length;
  if (n === 0) return [];
  const idxs =
    n === 1
      ? [0]
      : n === 2
        ? [0, 1]
        : [0, Math.floor((n - 1) / 2), n - 1];
  const unique = [...new Set(idxs)];
  return unique.map((i) => ({
    x: xAt(i, n),
    text: formatDate(pts[i]!.authored_at),
  }));
});

const ariaLabel = computed(() => {
  const latest = points.value[points.value.length - 1];
  if (!latest) return "Debt trend chart";
  return `Debt trend on ${props.currentBranch || "HEAD"}. Latest debt ${latest.debt}.`;
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
.debt-trend__branch {
  fill: rgba(0, 0, 0, 0.55);
  font-size: 11px;
  font-weight: 600;
}
.swatch {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  display: inline-block;
}
</style>
