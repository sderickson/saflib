<template>
  <ContentWidth variant="full">
    <h1 class="text-h4 mb-2">{{ strings.title }}</h1>
    <p class="text-body-2 mb-4">{{ strings.intro }}</p>

    <div class="mb-4">
      <div v-for="group in groups" :key="group.name" class="d-flex flex-wrap align-center ga-1 mb-1">
        <span class="text-caption text-medium-emphasis preset-group">{{ group.name }}</span>
        <v-chip
          v-for="p in group.presets"
          :key="p.label"
          size="small"
          :color="p.query === applied.query ? 'primary' : undefined"
          :variant="p.query === applied.query ? 'flat' : 'outlined'"
          data-test="metric-preset"
          @click="pick(p)"
        >
          {{ p.label }}
        </v-chip>
      </div>
    </div>

    <v-form class="mb-4" @submit.prevent="run">
      <v-textarea
        v-model="draft"
        :label="strings.queryLabel"
        rows="2"
        auto-grow
        hide-details
        class="promql mb-2"
        data-test="metric-query"
        @keydown.enter.exact.prevent="run"
      />
      <div class="d-flex align-center ga-3">
        <v-btn type="submit" color="primary" data-test="metric-run">{{ strings.run }}</v-btn>
        <v-btn-toggle v-model="hours" mandatory density="compact" variant="outlined" divided>
          <v-btn v-for="r in ranges" :key="r.label" :value="r.hours" size="small">{{ r.label }}</v-btn>
        </v-btn-toggle>
      </div>
    </v-form>

    <template v-if="applied.query">
      <OpsGraph
        :key="`${applied.query}|${applied.hours}`"
        :query="applied.query"
        :title="applied.title"
        :hours="applied.hours"
        :width="960"
        :height="340"
        class="mb-4"
      />

      <h2 class="text-subtitle-1 mb-2">{{ strings.current }}</h2>
      <v-alert v-if="instant.error.value" type="error" variant="tonal" density="compact" data-test="metric-error">
        {{ instant.error.value.message }}
      </v-alert>
      <p v-else-if="rows.length === 0 && !instant.isFetching.value" class="text-body-2">{{ strings.noSeries }}</p>
      <v-table v-else density="compact" class="elevation-1">
        <thead>
          <tr><th>{{ strings.series }}</th><th class="text-right">{{ strings.value }}</th></tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in rows" :key="i" data-test="metric-row">
            <td class="text-caption">{{ r.label }}</td>
            <td class="text-right">{{ r.value }}</td>
          </tr>
        </tbody>
      </v-table>
    </template>
  </ContentWidth>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ContentWidth } from "@saflib/vue/components";
import OpsGraph from "../components/OpsGraph.vue";
import { useOpsMetricsInstant } from "../requests/queries.ts";
import { METRIC_PRESETS, METRIC_RANGES, type MetricPreset } from "./OpsMetrics.presets.ts";
import { ops_metrics as strings } from "./OpsMetrics.strings.ts";

const route = useRoute();
const router = useRouter();
const ranges = METRIC_RANGES;

const groups = computed(() => {
  const byGroup = new Map<string, MetricPreset[]>();
  for (const p of METRIC_PRESETS) byGroup.set(p.group, [...(byGroup.get(p.group) ?? []), p]);
  return [...byGroup].map(([name, presets]) => ({ name, presets }));
});

// The view lives in the URL (?q=&hours=), so it can be bookmarked or shared.
const initialQuery = typeof route.query.q === "string" ? route.query.q : METRIC_PRESETS[0]!.query;
const initialHours = Number(route.query.hours) || 24;
const draft = ref(initialQuery);
const hours = ref<number>(METRIC_RANGES.some((r) => r.hours === initialHours) ? initialHours : 24);
const applied = ref({ query: initialQuery, hours: hours.value, title: titleFor(initialQuery) });

function titleFor(query: string): string {
  return METRIC_PRESETS.find((p) => p.query === query)?.label ?? "Custom query";
}

function run() {
  const query = draft.value.trim();
  if (!query) return;
  applied.value = { query, hours: hours.value, title: titleFor(query) };
  void router.replace({ query: { ...route.query, q: query, hours: String(hours.value) } });
}

function pick(p: MetricPreset) {
  draft.value = p.query;
  run();
}

watch(hours, () => run());

const appliedQuery = computed(() => applied.value.query);
const instant = useOpsMetricsInstant(appliedQuery);

const unit = computed(() => METRIC_PRESETS.find((p) => p.query === applied.value.query)?.unit);

function formatValue(raw: unknown): string {
  const v = Number(raw);
  if (!Number.isFinite(v)) return String(raw);
  switch (unit.value) {
    case "percent":
      return `${v.toFixed(2)}%`;
    case "seconds":
      return v < 1 ? `${(v * 1000).toFixed(1)} ms` : `${v.toFixed(2)} s`;
    case "bytes":
      return `${(v / 1024 / 1024).toFixed(1)} MB`;
    case "count":
      return v >= 100 ? Math.round(v).toLocaleString() : v.toFixed(2);
    default:
      return Number.isInteger(v) ? v.toLocaleString() : v.toPrecision(4);
  }
}

/** One row per series, labelled by the labels that matter (not the scrape's identity). */
const rows = computed(() => {
  const result = instant.data.value?.metrics.result ?? [];
  return result
    .map((r) => {
      const labels = Object.entries(r.metric ?? {})
        .filter(([k]) => !["__name__", "saf_app", "job", "instance"].includes(k))
        .map(([k, v]) => `${k}=${v}`)
        .join(", ");
      const raw = r.value?.[1];
      return { label: labels || r.metric?.__name__ || "value", value: formatValue(raw), sort: Number(raw) };
    })
    .sort((a, b) => (Number.isFinite(b.sort) ? b.sort : -Infinity) - (Number.isFinite(a.sort) ? a.sort : -Infinity));
});
</script>

<style scoped>
.preset-group {
  width: 96px;
}
.promql :deep(textarea) {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
}
</style>
