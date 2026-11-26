<template>
  <ContentWidth variant="full">
    <div class="d-flex flex-wrap align-baseline justify-space-between ga-2 mb-4">
      <h1 class="text-h4">{{ strings.title }}</h1>
      <div class="d-flex align-center ga-3 text-body-2 text-medium-emphasis">
        <span v-if="digest">{{ strings.checked }} {{ formatClock(digest.generated_at) }}</span>
        <v-btn variant="text" size="small" :loading="query.isFetching.value" @click="query.refetch()">
          {{ strings.refresh }}
        </v-btn>
      </div>
    </div>

    <v-alert v-if="query.error.value" type="error" variant="tonal" class="mb-4">
      {{ query.error.value.message }}
    </v-alert>
    <v-skeleton-loader v-else-if="!digest" type="article" />

    <template v-if="digest">
      <section v-for="group in groups" :key="group.key" class="mb-6" :aria-label="group.label">
        <h2 class="overview-heading mb-2">{{ group.label }}</h2>
        <div class="overview-tiles">
          <component
            :is="linkFor(tile.key) ? RouterLink : 'div'"
            v-for="tile in group.tiles"
            :key="tile.key"
            :to="linkFor(tile.key)"
            class="overview-tile"
            :class="`overview-tile--${tile.tone}`"
            data-test="overview-tile"
          >
            <div class="d-flex justify-space-between ga-2 text-body-2 text-medium-emphasis">
              <span>{{ tile.label }}</span>
              <span>{{ strings.tone_labels[tile.tone] }}</span>
            </div>
            <div class="text-h6 font-weight-bold">{{ tile.value }}</div>
            <div class="text-caption text-medium-emphasis">{{ tile.detail }}</div>
          </component>
        </div>
      </section>

      <section class="mb-6" :aria-label="graphsTitle">
        <div class="d-flex justify-space-between align-baseline mb-2">
          <h2 class="overview-heading">{{ graphsTitle }}</h2>
          <router-link v-if="links.metrics && metricsOn" :to="links.metrics" class="text-body-2">{{ strings.open_metrics }}</router-link>
        </div>
        <div v-if="metricsOn" class="overview-graphs">
          <OpsGraph :title="strings.requests" :query="GRAPH_REQUESTS" :width="420" :height="160" />
          <OpsGraph :title="strings.p95" :query="GRAPH_P95" :width="420" :height="160" />
          <OpsGraph :title="strings.memory" :query="GRAPH_MEMORY" :width="420" :height="160" />
        </div>
        <div v-else class="overview-graphs" data-test="overview-since-start">
          <v-card v-for="n in sinceStart" :key="n.label" variant="outlined" class="pa-3">
            <div class="text-body-2 text-medium-emphasis">{{ n.label }}</div>
            <div class="text-h5 font-weight-bold">{{ n.value }}</div>
            <div class="text-caption text-medium-emphasis">{{ n.note }}</div>
          </v-card>
        </div>
      </section>

      <v-card variant="outlined" class="overview-footer pa-3 d-flex flex-wrap align-center justify-space-between ga-3">
        <span class="text-body-2 text-medium-emphasis d-flex flex-wrap align-center ga-2">
          {{ strings.builds }}:
          <template v-for="c in [build.root, build.saflib]" :key="c.label">
            <span>
              {{ c.label }}
              <a v-if="c.href" :href="c.href" target="_blank" rel="noopener noreferrer"><code>{{ c.shortSha }}</code></a>
              <code v-else>{{ c.shortSha }}</code>
            </span>
          </template>
        </span>
        <router-link v-if="links.diagnostics" :to="links.diagnostics" class="text-body-2">{{ strings.self_test }}</router-link>
      </v-card>
    </template>
  </ContentWidth>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, type RouteLocationRaw } from "vue-router";
import { ContentWidth } from "@saflib/vue/components";
import { useOpsDigest } from "../requests/queries.ts";
import OpsGraph from "./OpsGraph.vue";
import { getBuildCommits, type BuildRepoUrls } from "./build-info.ts";
import { ops_overview as strings } from "./OpsOverview.strings.ts";

const props = withDefaults(
  defineProps<{
    /**
     * Where each tile leads, by tile key (`issues`, `jobs`,
     * `whatsapp-inbox`, …), plus `metrics` and `diagnostics`.
     */
    links?: Partial<Record<string, RouteLocationRaw>>;
    repos?: BuildRepoUrls;
  }>(),
  { links: () => ({}) },
);

const GRAPH_REQUESTS = 'sum(rate(http_request_duration_seconds_count{path!="unspecified"}[5m])) * 60';
const GRAPH_P95 = 'histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket{path!="unspecified"}[5m])))';
const GRAPH_MEMORY = 'process_resident_memory_bytes{saf_app!="host"}';

const query = useOpsDigest();
const digest = computed(() => query.data.value?.digest);

const linkFor = (key: string) => props.links[key];

const groups = computed(() => {
  const tiles = digest.value?.tiles ?? [];
  return [
    { key: "system", label: strings.system, tiles: tiles.filter((t) => t.group === "system") },
    { key: "customers", label: strings.customers, tiles: tiles.filter((t) => t.group === "customers") },
  ].filter((g) => g.tiles.length > 0);
});

const metricsOn = computed(() => !!digest.value?.metrics && !digest.value.metrics.error);
const graphsTitle = computed(() =>
  metricsOn.value || !digest.value
    ? strings.last_24h
    : strings.since_start(formatClock(digest.value.process.started_at)),
);

const formatBytes = (n: number | null) => (n == null ? "—" : `${Math.round(n / 1024 / 1024)} MB`);
const sinceStart = computed(() => {
  const p = digest.value?.process;
  if (!p) return [];
  return [
    { label: strings.requests, value: p.requests_total.toLocaleString(), note: strings.since_start_note },
    { label: strings.p95, value: p.p95_upper_ms == null ? "—" : `≤ ${p.p95_upper_ms} ms`, note: strings.p95_note },
    { label: strings.memory, value: formatBytes(p.rss_bytes), note: strings.right_now },
  ];
});

const build = computed(() => getBuildCommits(props.repos));

const formatClock = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(iso));
</script>

<style scoped>
.overview-heading {
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.overview-tiles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}
.overview-tile {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 8px;
  background: rgb(var(--v-theme-surface-bright, var(--v-theme-surface)));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-top-width: 4px;
  color: inherit;
  text-decoration: none;
}
.overview-tile--ok {
  border-top-color: rgb(var(--v-theme-success));
}
.overview-tile--warn {
  border-top-color: rgb(var(--v-theme-warning));
}
.overview-tile--bad {
  border-top-color: rgb(var(--v-theme-error));
}
a.overview-tile:hover,
a.overview-tile:focus-visible {
  background: rgba(var(--v-theme-on-surface), 0.03);
}
.overview-graphs {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}
.overview-footer {
  border-style: dashed;
}
</style>
