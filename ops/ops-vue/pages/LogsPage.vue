<template>
  <ContentWidth variant="full">
    <h1 class="text-h4 mb-2">{{ strings.title }}</h1>
    <p class="text-body-2 mb-4">{{ strings.intro }}</p>

    <v-form class="d-flex flex-wrap ga-2 mb-4 align-center" @submit.prevent="apply">
      <v-select
        v-model="draft.level"
        :items="levelOptions"
        :label="strings.levelLabel"
        density="compact"
        hide-details
        style="max-width: 180px"
      />
      <v-text-field
        v-model="draft.q"
        :label="strings.searchLabel"
        density="compact"
        hide-details
        data-test="logs-q"
        style="min-width: 240px"
      />
      <v-text-field
        v-model="draft.request_id"
        :label="strings.requestLabel"
        density="compact"
        hide-details
        style="max-width: 240px"
      />
      <v-btn type="submit" color="primary" data-test="logs-apply">{{ strings.apply }}</v-btn>
    </v-form>

    <v-table v-if="lines.length > 0" density="compact" class="elevation-1">
      <tbody>
        <tr v-for="line in lines" :key="line.id" data-test="log-line">
          <td class="text-no-wrap text-caption">{{ formatTime(line.ts) }}</td>
          <td>
            <v-chip :color="levelColor(line.level)" size="x-small">{{ line.level }}</v-chip>
          </td>
          <td class="text-caption text-no-wrap">{{ line.operation_name ?? line.service_name ?? "" }}</td>
          <td>
            <!-- Untrusted text: plain interpolation only (escaped), never v-html. -->
            <span class="log-message">{{ line.untrusted.message }}</span>
            <v-chip v-if="line.redactions > 0" size="x-small" color="warning" class="ml-2">
              {{ line.redactions }} {{ strings.redacted }}
            </v-chip>
            <!-- Fields collapse to their keys; click to see the whole object. -->
            <button
              v-if="line.untrusted.fields"
              type="button"
              class="text-caption text-medium-emphasis log-fields-toggle"
              :aria-expanded="expanded.has(line.id)"
              data-test="log-fields-toggle"
              @click="toggleFields(line.id)"
            >
              <span class="log-fields-chevron">{{ expanded.has(line.id) ? "▾" : "▸" }}</span>
              <span v-if="!expanded.has(line.id)" class="log-fields-keys" data-test="log-fields-keys">
                {{ fieldKeysSummary(line.untrusted.fields) }}
              </span>
            </button>
            <pre
              v-if="line.untrusted.fields && expanded.has(line.id)"
              class="text-caption log-fields-json"
              data-test="log-fields-json"
            >{{ JSON.stringify(line.untrusted.fields, null, 2) }}</pre>
          </td>
          <td class="text-caption">
            <a
              v-if="line.request_id"
              href="#"
              @click.prevent="filterByRequest(line.request_id)"
            >{{ line.request_id.slice(0, 8) }}</a>
          </td>
        </tr>
      </tbody>
    </v-table>
    <p v-else class="text-body-1">{{ strings.empty }}</p>

    <div class="mt-4">
      <v-btn
        v-if="logsQuery.hasNextPage.value"
        :loading="logsQuery.isFetchingNextPage.value"
        data-test="logs-more"
        @click="logsQuery.fetchNextPage()"
      >
        {{ strings.loadMore }}
      </v-btn>
    </div>
  </ContentWidth>
</template>

<script setup lang="ts">
import { computed, reactive } from "vue";
import { ContentWidth } from "@saflib/vue/components";
import { useLogsPageLoader } from "./Logs.loader.ts";
import { ops_logs as strings } from "./Logs.strings.ts";
import type { AdminLogFilters } from "../requests/queries.ts";

const { filters, logsQuery } = useLogsPageLoader();
const lines = computed(() => logsQuery.data.value?.pages.flatMap((p) => p.logs) ?? []);

const ANY_LEVEL = "any";
const levelOptions = [
  // Not undefined: v-select falls back to the title ("Any") for an undefined
  // value, which the API rejects as a level.
  { title: strings.anyLevel, value: ANY_LEVEL },
  { title: "error", value: "error" },
  { title: "warn", value: "warn" },
  { title: "info", value: "info" },
];

const draft = reactive<AdminLogFilters>({ ...filters.value });

/** Log lines whose fields are expanded. */
const expanded = reactive(new Set<number>());
function toggleFields(id: number) {
  if (expanded.has(id)) expanded.delete(id);
  else expanded.add(id);
}

/** "{ key1, key2, … }": what a collapsed fields object shows. */
function fieldKeysSummary(fields: unknown): string {
  if (fields === null || typeof fields !== "object" || Array.isArray(fields)) return "{ … }";
  const keys = Object.keys(fields);
  return keys.length === 0 ? "{}" : `{ ${keys.join(", ")} }`;
}

function apply() {
  filters.value = {
    level: (draft.level as string | undefined) === ANY_LEVEL ? undefined : draft.level,
    q: draft.q?.trim() || undefined,
    request_id: draft.request_id?.trim() || undefined,
  };
}

function filterByRequest(requestId: string) {
  draft.request_id = requestId;
  apply();
}

const formatTime = (ts: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "medium" }).format(new Date(ts));

const levelColor = (level: string) =>
  ({ error: "error", warn: "warning", info: "info" })[level] ?? "grey";
</script>

<style scoped>
.log-message {
  white-space: pre-wrap;
  word-break: break-word;
}
.log-fields-toggle {
  display: flex;
  align-items: baseline;
  gap: 4px;
  max-width: 100%;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.log-fields-keys {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.log-fields-json {
  margin: 4px 0 0;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
