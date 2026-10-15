<template>
  <div class="run-view__logs-wrap">
    <div :ref="onRootRef" class="run-view__logs" @scroll="onScroll">
      <!-- One wrapper so a ResizeObserver sees every change in content height. -->
      <div class="run-view__logs-content">
        <div v-if="logsPrunedAt" class="run-view__logs-pruned">
          This run's logs were deleted on {{ prunedDate }} because they were old. Its steps and
          commits are still here.
        </div>
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
          <ToolCallBatch v-else-if="item.type === 'tool-batch'" :calls="item.calls" />
          <LogEntryGroup v-else-if="item.type === 'channel-group'" :logs="item.logs" />
          <LogEntry v-else :log="item.log" />
        </div>
        <div v-if="loadingNewer" class="run-view__logs-loading">Loading later logs…</div>
        <!-- Not v-progress-linear: it pauses its animation whenever its
             IntersectionObserver says it's off-screen, which left it frozen
             here after the first pass. -->
        <div
          v-if="showRunningIndicator"
          class="run-view__logs-running"
          role="progressbar"
          aria-label="Agent is running"
        >
          <div class="run-view__logs-running-bar" />
        </div>
      </div>
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
import { computed, type VNodeRef } from "vue";
import type { LogItem } from "../../group-logs.ts";
import LogEntry from "../LogEntry.vue";
import LogEntryGroup from "../LogEntryGroup.vue";
import ToolCallCard from "../ToolCallCard.vue";
import ToolCallBatch from "../ToolCallBatch.vue";

const props = defineProps<{
  /** When this run's logs were deleted for age, if they were. */
  logsPrunedAt: string | null;
  /** Not pinned to the live bottom (scrolled up, or viewing a step's history). */
  showJumpToLatest: boolean;
  /** The agent is working and the loaded window ends at the newest log. */
  showRunningIndicator: boolean;
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

const prunedDate = computed(() =>
  props.logsPrunedAt ? new Date(props.logsPrunedAt).toLocaleDateString() : "",
);
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
.run-view__logs-running {
  /* Deliberately small: a glanceable "still going" under the latest log,
     not a page-wide banner. */
  position: relative;
  overflow: hidden;
  width: 160px;
  max-width: 100%;
  height: 3px;
  margin: 0.75rem auto 0.25rem;
  border-radius: 9999px;
  background: rgba(var(--v-theme-primary), 0.2);
}
.run-view__logs-running-bar {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 40%;
  border-radius: inherit;
  background: rgb(var(--v-theme-primary));
  animation: run-view-running 1.4s ease-in-out infinite;
}
@keyframes run-view-running {
  from {
    left: -40%;
  }
  to {
    left: 100%;
  }
}
@media (prefers-reduced-motion: reduce) {
  .run-view__logs-running-bar {
    left: 30%;
    animation: run-view-running-pulse 2s ease-in-out infinite;
  }
}
@keyframes run-view-running-pulse {
  50% {
    opacity: 0.35;
  }
}
.run-view__logs-pruned {
  opacity: 0.7;
  font-style: italic;
  padding-bottom: 0.5rem;
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
