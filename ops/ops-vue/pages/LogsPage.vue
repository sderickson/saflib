<template>
  <ContentWidth variant="full">
    <AdminPageTitle class="mb-1">{{ strings.title }}</AdminPageTitle>

    <v-card variant="outlined">
      <v-toolbar density="compact" color="surface" class="logs-toolbar px-2" role="toolbar" :aria-label="strings.title">
        <div class="d-flex flex-wrap align-center ga-2 w-100 py-2">
          <v-btn-toggle
            v-model="view"
            mandatory
            density="compact"
            variant="outlined"
            divided
            color="primary"
            :aria-label="strings.view_label"
          >
            <v-btn value="request" data-test="logs-view-request">{{ strings.by_request }}</v-btn>
            <v-btn value="chrono" data-test="logs-view-chrono">{{ strings.chronological }}</v-btn>
          </v-btn-toggle>
          <v-text-field
            v-model="draft.q"
            :label="strings.searchLabel"
            prepend-inner-icon="mdi-magnify"
            density="compact"
            variant="outlined"
            hide-details
            clearable
            class="logs-toolbar__search"
            data-test="logs-q"
          />
          <v-select
            v-model="level"
            :items="levelOptions"
            :label="strings.levelLabel"
            density="compact"
            variant="outlined"
            hide-details
            class="logs-toolbar__level"
          />
          <v-text-field
            v-model="draft.user"
            :label="strings.userLabel"
            density="compact"
            variant="outlined"
            hide-details
            clearable
            class="logs-toolbar__id"
          />
          <v-text-field
            v-model="draft.id"
            :label="strings.idLabel"
            density="compact"
            variant="outlined"
            hide-details
            clearable
            class="logs-toolbar__id"
            data-test="logs-id"
          />
          <v-spacer />
          <v-switch v-model="live" :label="strings.live" color="primary" density="compact" hide-details inset />
          <v-btn
            icon="mdi-refresh"
            variant="text"
            size="small"
            :aria-label="strings.refresh"
            :loading="activeQuery.isFetching.value && !live"
            @click="activeQuery.refetch()"
          />
        </div>
      </v-toolbar>
      <v-divider />

      <v-alert v-if="activeQuery.error.value" type="error" variant="tonal" class="ma-3">
        {{ activeQuery.error.value.message }}
      </v-alert>

      <v-table v-if="view === 'request'" density="compact" class="logs-table" data-test="logs-groups">
        <thead>
          <tr>
            <th aria-hidden="true" />
            <th>{{ strings.columns.time }}</th>
            <th class="saf-admin-hide-xs">{{ strings.columns.group }}</th>
            <th>{{ strings.columns.status }}</th>
            <th class="saf-admin-hide-xs">{{ strings.columns.duration }}</th>
            <th class="saf-admin-hide-xs">{{ strings.columns.who }}</th>
          </tr>
        </thead>
        <tbody>
          <LogGroupRow
            v-for="g in groups"
            :key="g.context_id ?? `line-${g.line_id}`"
            :group="g"
            :live="live"
          />
        </tbody>
      </v-table>

      <v-table v-else density="compact" class="logs-table" data-test="logs-chrono">
        <thead>
          <tr>
            <th aria-hidden="true" class="logs-bar-col" />
            <th>{{ strings.columns.time }}</th>
            <th>{{ strings.columns.level }}</th>
            <th class="saf-admin-hide-xs">{{ strings.columns.id }}</th>
            <th class="saf-admin-hide-xs">{{ strings.columns.operation }}</th>
            <th class="logs-message-col">{{ strings.columns.message }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="line in lines" :key="line.id" :class="`logs-line--${line.level}`" data-test="log-line">
            <td class="logs-bar-col">
              <span
                v-if="line.context_id"
                class="logs-bar"
                :style="{ background: idColor(line.context_id) }"
                aria-hidden="true"
              />
            </td>
            <td class="logs-mono text-medium-emphasis text-no-wrap">{{ formatTime(line.ts) }}</td>
            <td>
              <span class="logs-level" :class="`text-${levelColor(line.level) ?? 'medium-emphasis'}`">{{ line.level }}</span>
            </td>
            <td class="text-no-wrap saf-admin-hide-xs">
              <ShortId v-if="line.context_id" :id="line.context_id" :prefix="contextPrefix(line.context_kind)" />
              <span v-else class="text-medium-emphasis">—</span>
            </td>
            <td class="logs-mono text-medium-emphasis text-no-wrap saf-admin-hide-xs">{{ line.operation_name ?? "" }}</td>
            <td class="logs-mono logs-message">
              <!-- Untrusted text: plain interpolation only (escaped), never v-html. -->
              {{ line.untrusted.message }}
              <v-chip v-if="line.redactions > 0" size="x-small" color="warning" class="ms-1">
                {{ line.redactions }} {{ strings.redacted }}
              </v-chip>
              <LogLineFields :fields="line.untrusted.fields" />
            </td>
          </tr>
        </tbody>
      </v-table>

      <p v-if="isEmpty" class="text-body-2 text-medium-emphasis pa-4 mb-0">{{ strings.empty }}</p>
      <div v-if="activeQuery.hasNextPage.value" class="pa-3">
        <v-btn
          variant="text"
          :loading="activeQuery.isFetchingNextPage.value"
          data-test="logs-more"
          @click="activeQuery.fetchNextPage()"
        >
          {{ strings.loadMore }}
        </v-btn>
      </div>
    </v-card>
    <p v-if="view === 'chrono'" class="text-caption text-medium-emphasis mt-2">{{ strings.chrono_hint }}</p>
  </ContentWidth>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { AdminPageTitle, ContentWidth, ShortId } from "@saflib/vue/components";
import { idColor } from "@saflib/vue";
import { useLogsPageLoader } from "./Logs.loader.ts";
import { ops_logs as strings } from "./Logs.strings.ts";
import LogGroupRow from "./LogGroupRow.vue";
import LogLineFields from "./LogLineFields.vue";
import { contextPrefix, formatTime, levelColor } from "./log-format.ts";
import type { AdminLogFilters } from "../requests/queries.ts";

const route = useRoute();
const router = useRouter();
const param = (name: string) => {
  const raw = route?.query[name];
  return typeof raw === "string" ? raw : "";
};

const { filters, live, logsQuery, groupsQuery } = useLogsPageLoader();

// The URL is the source of truth for filters, so views and searches can be
// linked to (e.g. a user's server logs from the Users page).
const view = computed({
  get: () => (param("view") === "chrono" ? "chrono" : "request"),
  set: (v) => setParams({ view: v === "chrono" ? "chrono" : undefined }),
});
const LEVELS = ["error", "warn", "info"] as const;
const level = computed({
  get: () => (LEVELS as readonly string[]).includes(param("level")) ? param("level") : "any",
  set: (v) => setParams({ level: v === "any" ? undefined : v }),
});
const levelOptions = [
  { title: strings.anyLevel, value: "any" },
  { title: strings.warnUp, value: "warn" },
  { title: strings.errorsOnly, value: "error" },
];

// Text fields update the URL after a pause.
const draft = reactive({ q: param("q"), user: param("user"), id: param("id") });
let debounce: ReturnType<typeof setTimeout> | undefined;
watch(
  () => ({ ...draft }),
  (d) => {
    clearTimeout(debounce);
    debounce = setTimeout(
      () => setParams({ q: d.q?.trim() || undefined, user: d.user?.trim() || undefined, id: d.id?.trim() || undefined }),
      300,
    );
  },
);

function setParams(next: Record<string, string | undefined>) {
  router?.replace({ query: { ...route.query, ...next } });
}

watch(
  () => [param("q"), param("level"), param("user"), param("id")],
  () => {
    const f: AdminLogFilters = {
      q: param("q") || undefined,
      level: (LEVELS as readonly string[]).includes(param("level"))
        ? (param("level") as AdminLogFilters["level"])
        : undefined,
      user_id: param("user") || undefined,
      context_id: param("id") || undefined,
    };
    filters.value = f;
  },
  { immediate: true },
);

const groups = computed(() => groupsQuery.data.value?.pages.flatMap((p) => p.groups) ?? []);
const lines = computed(() => logsQuery.data.value?.pages.flatMap((p) => p.logs) ?? []);
const activeQuery = computed(() => (view.value === "request" ? groupsQuery : logsQuery));
const isEmpty = computed(
  () =>
    activeQuery.value.isSuccess.value &&
    (view.value === "request" ? groups.value.length === 0 : lines.value.length === 0),
);
</script>

<style scoped>
.logs-toolbar {
  height: auto !important;
}
.logs-toolbar :deep(.v-toolbar__content) {
  height: auto !important;
}
.logs-toolbar__search {
  flex: 1 1 220px;
  min-width: 180px;
}
.logs-toolbar__level {
  flex: 0 0 160px;
}
.logs-toolbar__id {
  flex: 0 1 170px;
  min-width: 130px;
}
.logs-table :deep(td) {
  height: auto !important;
  padding-top: 4px !important;
  padding-bottom: 4px !important;
  vertical-align: top;
}
.logs-bar-col {
  width: 6px;
  padding: 0 !important;
}
.logs-bar {
  display: block;
  width: 4px;
  min-height: 20px;
  height: 100%;
  border-radius: 2px;
}
.logs-message-col {
  min-width: 360px;
}
.logs-message {
  white-space: pre-wrap;
  word-break: break-word;
}
.logs-level {
  font-size: 0.6875rem;
  font-weight: 600;
}
.logs-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.8125rem;
}
.logs-line--error {
  background: rgba(var(--v-theme-error), 0.04);
}
.logs-line--warn {
  background: rgba(var(--v-theme-warning), 0.05);
}
</style>
