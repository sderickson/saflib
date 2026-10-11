<template>
  <div :ref="onRootRef" class="run-view__logs" @scroll="onScroll">
    <div
      v-if="logAnchor !== undefined"
      class="run-view__logs-anchor-banner text-body-2 text-medium-emphasis"
    >
      Viewing step {{ logAnchor }} history —
      <button type="button" class="run-view__logs-live-link" @click="$emit('return-live')">
        jump to live
      </button>
    </div>
    <div v-if="loadingOlder" class="run-view__logs-loading">Loading earlier logs…</div>
    <div
      v-for="item in logItems"
      :key="itemKey(item)"
      class="run-view__log-item"
      :data-step-index="stepIndex(item)"
      :class="{ 'run-view__log-item--sticky': stickyAgentInput && isLastAgentInput(item) }"
    >
      <ToolCallCard
        v-if="item.type === 'tool-call'"
        :name="item.name"
        :input="item.input"
        :result-log="item.resultLog"
      />
      <LogEntryGroup v-else-if="item.type === 'channel-group'" :logs="item.logs" />
      <LogEntry v-else :log="item.log" />
    </div>
    <div v-if="loadingNewer" class="run-view__logs-loading">Loading later logs…</div>
  </div>
</template>

<script setup lang="ts">
import type { VNodeRef } from "vue";
import type { LogItem } from "../../group-logs.ts";
import LogEntry from "../LogEntry.vue";
import LogEntryGroup from "../LogEntryGroup.vue";
import ToolCallCard from "../ToolCallCard.vue";

defineProps<{
  logAnchor?: number;
  logItems: LogItem[];
  loadingOlder: boolean;
  loadingNewer: boolean;
  stickyAgentInput: boolean;
  itemKey: (item: LogItem) => string;
  stepIndex: (item: LogItem) => number | null;
  isLastAgentInput: (item: LogItem) => boolean;
  onScroll: () => void;
  onRootRef: VNodeRef;
}>();

defineEmits<{ "return-live": [] }>();
</script>

<style scoped>
.run-view__logs {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  font-size: 0.85rem;
  padding: 0.75rem 1rem;
  background: rgba(128, 128, 128, 0.05);
}
.run-view__logs-anchor-banner {
  position: sticky;
  top: 0;
  z-index: 2;
  padding: 0.35rem 0.75rem;
  background: rgba(var(--v-theme-surface), 0.95);
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}
.run-view__logs-live-link {
  background: none;
  border: none;
  padding: 0;
  color: rgb(var(--v-theme-primary));
  cursor: pointer;
  text-decoration: underline;
}
.run-view__logs-loading {
  opacity: 0.6;
  font-size: 0.8rem;
  padding-bottom: 0.5rem;
}
.run-view__log-item--sticky {
  position: sticky;
  top: 0;
  z-index: 1;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}
</style>
