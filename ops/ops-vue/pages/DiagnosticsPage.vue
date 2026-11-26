<template>
  <ContentWidth variant="full">
    <div class="d-flex flex-wrap align-start justify-space-between ga-4 mb-4">
      <div style="max-width: 760px">
        <h1 class="text-h4 mb-1">{{ strings.title }}</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">{{ strings.intro }}</p>
      </div>
      <div class="d-flex ga-2">
        <v-btn variant="text" :loading="clear.isPending.value" data-test="diagnostics-clear" @click="onClear">
          {{ strings.clear }}
        </v-btn>
        <v-btn color="primary" variant="flat" :disabled="!probes.length" data-test="diagnostics-run-all" @click="run.runAll(probes)">
          {{ strings.run_all }}
        </v-btn>
      </div>
    </div>

    <AdminPanel class="mb-6">
      <template #title>
        <h2 class="text-subtitle-1 font-weight-medium">
          <template v-if="run.startedAt.value">
            {{ strings.last_run }} · {{ formatClock(run.startedAt.value.toISOString()) }}
            <span class="text-body-2 text-medium-emphasis">· {{ strings.tag }} <code>diag:{{ run.runId.value }}</code></span>
          </template>
          <template v-else>{{ strings.no_run }}</template>
        </h2>
      </template>
      <template v-if="run.startedAt.value" #actions>
        <div class="d-flex ga-2" data-test="diagnostics-counts">
          <v-chip size="small" variant="tonal" color="success">{{ run.counts.value.landed }} {{ strings.landed }}</v-chip>
          <v-chip size="small" variant="tonal">{{ run.counts.value.skipped }} {{ strings.skipped }}</v-chip>
          <v-chip size="small" variant="tonal" :color="run.counts.value.missing ? 'error' : undefined">
            {{ run.counts.value.missing }} {{ strings.missing }}
          </v-chip>
          <v-chip v-if="run.counts.value.waiting" size="small" variant="tonal">{{ run.counts.value.waiting }} {{ strings.waiting }}</v-chip>
        </div>
      </template>
      <v-progress-linear v-if="list.isPending.value" indeterminate />
      <v-table density="compact">
        <thead>
          <tr>
            <th aria-hidden="true" style="width: 48px" />
            <th>{{ strings.columns.check }}</th>
            <th>{{ strings.columns.side }}</th>
            <th>{{ strings.columns.what }}</th>
            <th>{{ strings.columns.dest }}</th>
            <th>{{ strings.columns.result }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in probes" :key="p.id" data-test="diagnostic-probe">
            <td>
              <v-btn
                icon="mdi-play"
                size="small"
                variant="text"
                color="primary"
                :disabled="!!p.skip_reason"
                :aria-label="strings.run_one(p.label)"
                :data-test="`run-${p.id}`"
                @click="run.fire(p)"
              />
            </td>
            <td class="text-body-2 font-weight-medium">{{ p.label }}</td>
            <td><v-chip size="x-small" variant="tonal">{{ strings.side[p.side] }}</v-chip></td>
            <td class="text-body-2">{{ p.what }}</td>
            <td class="text-body-2">{{ p.destination }}</td>
            <td class="text-body-2" :data-test="`result-${p.id}`">
              <span class="d-inline-flex align-center ga-2">
                <span class="result-dot" :class="`result-dot--${tone(p)}`" aria-hidden="true" />
                <span>{{ resultText(p) }}</span>
                <router-link v-if="resultLink(p)" :to="resultLink(p)!">{{ strings.view_in[p.link] }}</router-link>
              </span>
            </td>
          </tr>
        </tbody>
      </v-table>
    </AdminPanel>

    <div class="diagnostics-cards">
      <v-card class="pa-4">
        <h2 class="text-subtitle-1 font-weight-medium mb-3">{{ strings.build }}</h2>
        <dl class="build-grid">
          <template v-for="c in [build.root, build.saflib]" :key="c.label">
            <dt>{{ c.label }}</dt>
            <dd>
              <a v-if="c.href" :href="c.href" target="_blank" rel="noopener noreferrer"><code>{{ c.sha.slice(0, 12) }}</code></a>
              <code v-else>{{ c.sha }}</code>
            </dd>
          </template>
          <dt>{{ strings.build_rows.started }}</dt>
          <dd>{{ startedAt }}</dd>
          <dt>{{ strings.build_rows.env }}</dt>
          <dd>{{ deployment }}</dd>
        </dl>
      </v-card>
      <MetricsCard />
    </div>

    <!-- The client-vue probe mounts this; it throws while setting up. -->
    <DiagnosticThrower v-if="throwMessage" :key="throwMessage" :message="throwMessage" />
  </ContentWidth>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";
import type { RouteLocationRaw } from "vue-router";
import type { OpsDiagnosticProbe } from "@saflib/ops-spec";
import { AdminPanel, ContentWidth } from "@saflib/vue/components";
import { getDeploymentName, showInfo } from "@saflib/vue";
import { useClearOpsDiagnostics, useOpsDiagnostics, useOpsDigest } from "../requests/queries.ts";
import { getBuildCommits, type BuildRepoUrls } from "../components/build-info.ts";
import { useDiagnosticRun } from "./diagnostic-run.ts";
import DiagnosticThrower from "./DiagnosticThrower.vue";
import MetricsCard from "./MetricsCard.vue";
import { ops_diagnostics as strings } from "./Diagnostics.strings.ts";

const props = withDefaults(
  defineProps<{
    /** Admin paths for where signals land: issues, logs, jobs, audit, alerts, metrics. */
    links?: Partial<Record<string, string>>;
    repos?: BuildRepoUrls;
  }>(),
  { links: () => ({}) },
);

const list = useOpsDiagnostics();
const probes = computed(() => list.data.value?.probes ?? []);
const clear = useClearOpsDiagnostics();

const throwMessage = ref<string | null>(null);
const run = useDiagnosticRun({
  throwVue: (message) => {
    throwMessage.value = message;
  },
});
onUnmounted(run.stop);

async function onClear() {
  const { resolved_issues } = await clear.mutateAsync();
  showInfo(strings.cleared(resolved_issues));
}

const stateOf = (p: OpsDiagnosticProbe) => run.states[p.id];
const tone = (p: OpsDiagnosticProbe) => {
  const s = stateOf(p)?.status;
  if (p.skip_reason || s === "skipped") return "muted";
  if (s === "landed") return "ok";
  if (s === "missing" || s === "error") return "bad";
  if (s === "waiting" || s === "sending") return "busy";
  return "muted";
};
const resultText = (p: OpsDiagnosticProbe) => {
  if (p.skip_reason) return `Skipped: ${p.skip_reason}`;
  const s = stateOf(p);
  if (!s) return strings.result.idle;
  if (s.status === "landed") return strings.landed_in(s.landedMs ?? 0);
  if (s.status === "error") return `${strings.result.error}: ${s.error}`;
  return strings.result[s.status] ?? s.status;
};
const resultLink = (p: OpsDiagnosticProbe): RouteLocationRaw | undefined => {
  const s = stateOf(p);
  const base = props.links[p.link];
  if (s?.status !== "landed" || !base) return undefined;
  if (p.link === "logs" && s.ref?.id) return `${base}?id=${encodeURIComponent(s.ref.id)}`;
  return base;
};

const build = computed(() => getBuildCommits(props.repos));
const deployment = getDeploymentName() ?? "unknown";
const digest = useOpsDigest();
const startedAt = computed(() => {
  const iso = digest.data.value?.digest.process.started_at;
  return iso ? new Date(iso).toLocaleString() : "—";
});

const formatClock = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(iso));
</script>

<style scoped>
.diagnostics-cards {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) minmax(0, 2.5fr);
  gap: 16px;
  align-items: start;
}
@media (max-width: 960px) {
  .diagnostics-cards {
    grid-template-columns: 1fr;
  }
}
.build-grid {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 6px 16px;
  margin: 0;
  font-size: 0.875rem;
}
.build-grid dt {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.build-grid dd {
  margin: 0;
}
.result-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: 0 0 8px;
  background: rgba(var(--v-theme-on-surface), 0.25);
}
.result-dot--ok {
  background: rgb(var(--v-theme-success));
}
.result-dot--bad {
  background: rgb(var(--v-theme-error));
}
.result-dot--busy {
  background: rgb(var(--v-theme-warning));
}
</style>
