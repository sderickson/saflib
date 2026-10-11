<template>
  <div class="run-view__logs-wrap">
    <div :ref="onRootRef" class="run-view__logs" @scroll="onScroll">
      <div v-if="loadingOlder" class="run-view__logs-loading">Loading earlier logs…</div>
      <div
        v-for="item in logItems"
        :key="itemKey(item)"
        class="run-view__log-item"
        :data-step-index="stepIndex(item)"
        :data-seq="seq(item)"
        :class="{ 'run-view__log-item--sticky': stickyAgentInput && isLastAgentInput(item) }"
      >
        <ToolCallCard
          v-if="item.type === 'tool-call'"
          :name="item.name"
          :input="item.input"
          :result-log="item.resultLog"
          :started-at="item.useLog.created_at"
        />
        <LogEntryGroup v-else-if="item.type === 'channel-group'" :logs="item.logs" />
        <LogEntry v-else :log="item.log" />
      </div>
      <div v-if="loadingNewer" class="run-view__logs-loading">Loading later logs…</div>
    </div>
    <v-btn
      v-if="showJumpToLatest"
      class="run-view__logs-jump"
      size="small"
      rounded="pill"
      color="primary"
      prepend-icon="mdi-arrow-down"
      @click="$emit('return-live')"
    >
      Jump to latest
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import type { VNodeRef } from "vue";
import type { LogItem } from "../../group-logs.ts";
import LogEntry from "../LogEntry.vue";
import LogEntryGroup from "../LogEntryGroup.vue";
import ToolCallCard from "../ToolCallCard.vue";

defineProps<{
  /** Not pinned to the live bottom (scrolled up, or viewing a step's history). */
  showJumpToLatest: boolean;
  logItems: LogItem[];
  loadingOlder: boolean;
  loadingNewer: boolean;
  stickyAgentInput: boolean;
  itemKey: (item: LogItem) => string;
  stepIndex: (item: LogItem) => number | null;
  seq: (item: LogItem) => number;
  isLastAgentInput: (item: LogItem) => boolean;
  onScroll: () => void;
  onRootRef: VNodeRef;
}>();

defineEmits<{ "return-live": [] }>();
</script>

<style scoped>
.run-view__logs-wrap {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.run-view__logs {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  font-size: 0.85rem;
  padding: 0.75rem 1rem;
  background: rgba(128, 128, 128, 0.05);
}
.run-view__logs-jump {
  position: absolute;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3;
}
.run-view__logs-loading {
  opacity: 0.6;
  font-size: 0.8rem;
  padding-bottom: 0.5rem;
}
.run-view__log-item--sticky {
  position: sticky;
  /* Cancel the scroller's top padding — sticky offsets are measured inside
     it, which otherwise leaves a strip of scrolling logs above this. */
  top: -0.75rem;
  /* Contain the card's own margins so no see-through gap sits above it. */
  display: flow-root;
  z-index: 1;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}
</style>
