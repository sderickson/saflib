<template>
  <ContentWidth variant="full" class="dev-logs-page">
        <div class="d-flex flex-wrap align-center ga-3 mb-4">
          <h1 class="text-h4 mb-0">Server Logs</h1>
          <v-chip :color="statusColor" size="small" variant="flat">
            {{ statusLabel }}
          </v-chip>
          <span class="text-medium-emphasis">
            {{ filteredLogs.length }} / {{ logs.length }}
          </span>
        </div>

        <v-alert v-if="listError" type="error" class="mb-4">
          Error loading logs: {{ listError.message }}
        </v-alert>
        <v-alert v-if="streamErrorMessage" type="warning" class="mb-4">
          {{ streamErrorMessage }}
        </v-alert>

        <div class="d-flex flex-wrap ga-2 mb-4">
          <v-text-field
            v-model="filter"
            label="Filter"
            type="search"
            density="compact"
            hide-details
            clearable
            style="min-width: 160px; max-width: 240px"
          />
          <v-select
            v-model="levelFilter"
            :items="levelOptions"
            label="Level"
            density="compact"
            hide-details
            style="min-width: 120px; max-width: 160px"
          />
          <v-btn size="small" variant="tonal" @click="togglePause">
            {{ paused ? "Resume" : "Pause" }}
          </v-btn>
          <v-btn size="small" variant="tonal" @click="clearAll">Clear</v-btn>
          <v-btn
            size="small"
            variant="tonal"
            :loading="isLoadingList"
            @click="reload"
          >
            Reload
          </v-btn>
        </div>

        <div
          ref="listEl"
          class="log-list elevation-1 rounded"
          @scroll="onScroll"
        >
          <div
            v-for="entry in filteredLogs"
            :key="entry.id"
            class="log-entry"
            :class="[
              levelClass(entry.level),
              {
                expandable: entry.meta !== undefined,
                open: expandedId === entry.id,
              },
            ]"
            @click="toggleExpand(entry)"
          >
            <div class="log-row">
              <span class="log-ts">{{ entry.timestamp || "" }}</span>
              <span class="log-lvl">{{ entry.level }}</span>
              <span class="log-ctx" :title="entry.subsystem_name || ''">
                {{ entry.operation_name || entry.subsystem_name || "" }}
              </span>
              <span class="log-msg">
                <span>{{ entry.message }}</span>
                <span
                  v-if="entry.meta !== undefined && expandedId !== entry.id"
                  class="log-meta-preview"
                >
                  {{ metaPreview(entry.meta) }}
                </span>
              </span>
            </div>
            <pre
              v-if="entry.meta !== undefined && expandedId === entry.id"
              class="log-meta-full"
              >{{ metaPretty(entry.meta) }}</pre
            >
          </div>
          <p v-if="filteredLogs.length === 0" class="log-empty">
            No log entries yet.
          </p>
        </div>
  </ContentWidth>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, watch } from "vue";
import { ContentWidth } from "@saflib/vue/components";
import type { DevLogEntry } from "@saflib/node-log-spec";
import { useListDevLogs, useStreamDevLogs } from "@saflib/node-log-sdk";


const filter = ref("");
const levelFilter = ref("all");
const paused = ref(false);
const stickToBottom = ref(true);
const listEl = ref<HTMLElement | null>(null);
const expandedId = ref<number | null>(null);

const levelOptions = [
  "all",
  "error",
  "warn",
  "info",
  "verbose",
  "debug",
  "silly",
];
const META_PREVIEW_MAX = 120;

const {
  data: listData,
  error: listError,
  isLoading: isLoadingList,
  refetch,
} = useListDevLogs();

const initialLogs = shallowRef<DevLogEntry[]>([]);
watch(
  () => listData.value?.logs,
  (logs) => {
    if (logs) initialLogs.value = logs;
  },
  { immediate: true },
);

const {
  logs,
  status: streamStatus,
  errorMessage: streamErrorMessage,
  reconnect,
  clearLocal,
} = useStreamDevLogs({
  paused,
  initialLogs,
});

const filteredLogs = computed(() => {
  const q = filter.value.trim().toLowerCase();
  return logs.value.filter((entry) => {
    if (levelFilter.value !== "all" && entry.level !== levelFilter.value) {
      return false;
    }
    if (!q) return true;
    const metaStr =
      entry.meta === undefined ? "" : metaText(entry.meta).toLowerCase();
    return (
      entry.message.toLowerCase().includes(q) ||
      metaStr.includes(q) ||
      (entry.subsystem_name?.toLowerCase().includes(q) ?? false) ||
      (entry.operation_name?.toLowerCase().includes(q) ?? false) ||
      (entry.req_id?.toLowerCase().includes(q) ?? false)
    );
  });
});

const statusLabel = computed(() => {
  if (paused.value) return "paused";
  if (isLoadingList.value && logs.value.length === 0) return "connecting";
  return streamStatus.value;
});

const statusColor = computed(() => {
  switch (statusLabel.value) {
    case "live":
      return "success";
    case "connecting":
      return "warning";
    case "error":
      return "error";
    case "paused":
      return "info";
    default:
      return "grey";
  }
});

function metaText(meta: unknown): string {
  try {
    return JSON.stringify(meta);
  } catch {
    return String(meta);
  }
}

function metaPreview(meta: unknown): string {
  const text = metaText(meta);
  if (text.length <= META_PREVIEW_MAX) return text;
  return text.slice(0, META_PREVIEW_MAX - 1) + "…";
}

function metaPretty(meta: unknown): string {
  try {
    return JSON.stringify(meta, null, 2);
  } catch {
    return String(meta);
  }
}

function levelClass(level: string) {
  switch (level) {
    case "error":
      return "lvl-error";
    case "warn":
      return "lvl-warn";
    case "info":
      return "lvl-info";
    case "debug":
    case "verbose":
    case "silly":
      return "lvl-debug";
    default:
      return "lvl-info";
  }
}

function toggleExpand(entry: DevLogEntry) {
  if (entry.meta === undefined) return;
  expandedId.value = expandedId.value === entry.id ? null : entry.id;
}

async function scrollToBottom() {
  await nextTick();
  const el = listEl.value;
  if (el && stickToBottom.value) {
    el.scrollTop = el.scrollHeight;
  }
}

function onScroll() {
  const el = listEl.value;
  if (!el) return;
  const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
  stickToBottom.value = distance < 40;
}

watch(filteredLogs, () => {
  void scrollToBottom();
});

function togglePause() {
  paused.value = !paused.value;
}

function clearAll() {
  clearLocal();
  expandedId.value = null;
}

async function reload() {
  await refetch();
  reconnect();
  await scrollToBottom();
}
</script>

<style scoped>
.dev-logs-page {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
}

.log-list {
  max-height: 70vh;
  overflow: auto;
  background: rgb(var(--v-theme-surface));
}

.log-entry {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.log-entry.expandable {
  cursor: pointer;
}

.log-entry.expandable:hover,
.log-entry.open {
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.log-row {
  display: grid;
  grid-template-columns: 11ch 52px minmax(80px, 160px) 1fr;
  gap: 8px;
  padding: 4px 12px;
  align-items: baseline;
}

.log-ts {
  color: rgba(var(--v-theme-on-surface), 0.5);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.log-lvl {
  font-weight: 600;
  text-transform: uppercase;
  font-size: 10px;
}

.log-ctx {
  color: rgba(var(--v-theme-on-surface), 0.6);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.log-msg {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.log-meta-preview {
  margin-left: 0.6em;
  color: rgba(var(--v-theme-on-surface), 0.45);
}

.log-meta-full {
  margin: 0;
  padding: 6px 12px 10px calc(11ch + 52px + 160px + 34px);
  color: rgba(var(--v-theme-on-surface), 0.65);
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 11px;
  line-height: 1.35;
}

.lvl-error .log-lvl,
.lvl-error .log-msg > span:first-child {
  color: rgb(var(--v-theme-error));
}

.lvl-warn .log-lvl,
.lvl-warn .log-msg > span:first-child {
  color: rgb(var(--v-theme-warning));
}

.lvl-info .log-lvl {
  color: rgb(var(--v-theme-info));
}

.lvl-debug .log-lvl,
.lvl-debug .log-msg > span:first-child {
  color: rgb(var(--v-theme-secondary));
}

.log-empty {
  padding: 24px;
  text-align: center;
  color: rgba(var(--v-theme-on-surface), 0.5);
}
</style>
