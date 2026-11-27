<template>
  <ContentWidth variant="full">
    <AdminPanel padded class="mb-4">
      <div class="d-flex flex-wrap ga-2 mb-3" data-test="analytics-saved">
        <v-chip
          v-for="q in savedAnalyticsQueries"
          :key="q.label"
          size="small"
          variant="outlined"
          data-test="analytics-saved-query"
          @click="use(q.sql)"
        >
          {{ q.label }}
        </v-chip>
      </div>
      <v-textarea
        v-model="draft"
        :label="strings.sql_label"
        class="analytics-sql"
        rows="5"
        auto-grow
        spellcheck="false"
        autocomplete="off"
        hide-details
        data-test="analytics-sql"
        @keydown.enter.meta.prevent="run"
        @keydown.enter.ctrl.prevent="run"
      />
      <div class="d-flex align-center ga-3 mt-3">
        <v-btn color="primary" variant="flat" :loading="query.isFetching.value" data-test="analytics-run" @click="run">
          {{ strings.run }}
        </v-btn>
        <span class="text-caption text-medium-emphasis">{{ strings.run_hint }}</span>
      </div>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">{{ strings.schema_help }}</p>
    </AdminPanel>

    <v-alert v-if="query.error.value" type="error" variant="tonal" density="compact" class="mb-4" data-test="analytics-error">
      {{ query.error.value.message }}
    </v-alert>

    <AdminPanel v-if="result" data-test="analytics-result">
      <div class="text-caption text-medium-emphasis px-4 pt-3">
        {{ strings.rows(result.rows.length, result.truncated, result.duration_ms) }}
      </div>
      <p v-if="!result.rows.length" class="saf-admin-empty pa-4 ma-0">{{ strings.empty_result }}</p>
      <div v-else class="analytics-table-wrap">
        <v-table density="compact">
          <thead>
            <tr>
              <th v-for="c in result.columns" :key="c" class="text-no-wrap">{{ c }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in result.rows" :key="i" data-test="analytics-row">
              <!-- Values come from logs: plain interpolation only (escaped). -->
              <td v-for="(v, j) in row" :key="j" class="analytics-cell" :class="{ 'text-medium-emphasis': v === null }">
                {{ show(v) }}
              </td>
            </tr>
          </tbody>
        </v-table>
      </div>
    </AdminPanel>
  </ContentWidth>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { AdminPanel, ContentWidth } from "@saflib/vue/components";
import { useOpsLogsQuery } from "../requests/queries.ts";
import { savedAnalyticsQueries } from "./analytics-queries.ts";
import { ops_analytics as strings } from "./Analytics.strings.ts";

const route = useRoute();
const router = useRouter();

// The applied query lives in the URL (?q=), so a query can be shared or bookmarked.
const applied = computed(() => (typeof route.query.q === "string" ? route.query.q : ""));
const draft = ref(applied.value || savedAnalyticsQueries[0]!.sql);
watch(applied, (q) => {
  if (q) draft.value = q;
});

const query = useOpsLogsQuery(applied);
const result = computed(() => query.data.value);

function run() {
  const sql = draft.value.trim();
  if (!sql) return;
  if (sql === applied.value) void query.refetch();
  else void router.replace({ query: { ...route.query, q: sql } });
}

function use(sql: string) {
  draft.value = sql;
  run();
}

function show(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
</script>

<style scoped>
.analytics-sql :deep(textarea) {
  font-family: ui-monospace, Menlo, monospace;
  font-size: 0.8125rem;
}
.analytics-table-wrap {
  overflow-x: auto;
}
.analytics-cell {
  font-family: ui-monospace, Menlo, monospace;
  font-size: 0.75rem;
  max-width: 480px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
