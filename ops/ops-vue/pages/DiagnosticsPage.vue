<template>
  <ContentWidth variant="full">
    <div class="d-flex flex-wrap align-center justify-space-between ga-4 mb-2">
      <AdminPageTitle>{{ strings.title }}</AdminPageTitle>
      <div class="d-flex ga-2 ms-auto">
        <v-btn variant="text" :loading="clear.isPending.value" data-test="diagnostics-clear" @click="onClear">
          {{ strings.clear }}
        </v-btn>
        <v-btn color="primary" variant="flat" :disabled="!probes.length" data-test="diagnostics-run-all" @click="run.runAll(probes)">
          {{ strings.run_all }}
        </v-btn>
      </div>
    </div>


    <AdminPanel>
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
            <th class="saf-admin-hide-xs">{{ strings.columns.dest }}</th>
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
            <td class="text-body-2 font-weight-medium">
              <!-- What it does, and whether it runs in the browser or on the server, on hover. -->
              <span :title="`${p.what} (${strings.side[p.side].toLowerCase()})`">{{ p.label }}</span>
            </td>
            <td class="text-body-2 saf-admin-hide-xs">{{ p.destination }}</td>
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


    <!-- The client-vue probe mounts this; it throws while setting up. -->
    <DiagnosticThrower v-if="throwMessage" :key="throwMessage" :message="throwMessage" />
  </ContentWidth>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";
import type { RouteLocationRaw } from "vue-router";
import type { OpsDiagnosticProbe } from "@saflib/ops-spec";
import { AdminPageTitle, AdminPanel, ContentWidth } from "@saflib/vue/components";
import { showInfo } from "@saflib/vue";
import { useClearOpsDiagnostics, useOpsDiagnostics } from "../requests/queries.ts";
import { useDiagnosticRun } from "./diagnostic-run.ts";

import DiagnosticThrower from "./DiagnosticThrower.vue";
import { ops_diagnostics as strings } from "./Diagnostics.strings.ts";

const props = withDefaults(
  defineProps<{
    /** Admin paths for where signals land: issues, logs, jobs, audit, alerts, metrics. */
    links?: Partial<Record<string, string>>;
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

const formatClock = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(iso));
</script>

<style scoped>
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
