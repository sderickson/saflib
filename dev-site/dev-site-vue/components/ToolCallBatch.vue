<template>
  <v-card
    variant="outlined"
    density="compact"
    class="tool-call-batch"
    :class="{ 'tool-call-batch--error': hasError }"
  >
    <div class="tool-call-batch__head">
      <span class="tool-call-batch__title">{{ summary }}</span>
      <span class="tool-call-batch__status">
        <span v-if="running" class="text-caption text-medium-emphasis">running…</span>
        <span v-if="timeLabel" class="tool-call-batch__time">{{ timeLabel }}</span>
      </span>
    </div>
    <template v-for="row in rows" :key="row.call.id">
      <button
        type="button"
        class="tool-call-batch__row"
        :class="{ 'tool-call-batch__row--error': row.isError }"
        :aria-expanded="openId === row.call.id"
        @click="openId = openId === row.call.id ? undefined : row.call.id"
      >
        <span class="tool-call-batch__name">{{ row.title }}</span>
        <span class="tool-call-batch__detail">{{ row.detail }}</span>
      </button>
      <ToolCallCard
        v-if="openId === row.call.id"
        :name="row.call.name"
        :input="row.call.input"
        :result-log="row.call.resultLog"
        :started-at="row.call.useLog.created_at"
      />
    </template>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { parseToolLogPayload } from "@saflib/new-workflows-spec";
import type { ToolCallGroup } from "../group-logs.ts";
import { formatToolInvocation } from "../tool-display.ts";
import { formatLogTime } from "../format-log-time.ts";
import ToolCallCard from "./ToolCallCard.vue";

const props = defineProps<{ calls: ToolCallGroup[] }>();

const openId = ref<string | undefined>(undefined);

const rows = computed(() =>
  props.calls.map((call) => {
    const invocation = formatToolInvocation(call.name, call.input);
    const result = call.resultLog ? parseToolLogPayload(call.resultLog.content) : undefined;
    return {
      call,
      title: invocation.title,
      detail: invocation.detail ?? "",
      isError: result?.kind === "tool_result" && result.is_error,
    };
  }),
);

const hasError = computed(() => rows.value.some((r) => r.isError));
const running = computed(() => props.calls.some((c) => !c.resultLog));
const timeLabel = computed(() => formatLogTime(props.calls[0]!.useLog.created_at));

/** e.g. "Read 4 files, 2 searches". */
const summary = computed(() => {
  const count = (names: string[]) => props.calls.filter((c) => names.includes(c.name)).length;
  const reads = count(["Read"]);
  const searches = count(["Grep", "Glob"]);
  const listings = count(["LS"]);
  const parts = [
    reads ? `${reads} ${reads === 1 ? "file" : "files"} read` : "",
    searches ? `${searches} ${searches === 1 ? "search" : "searches"}` : "",
    listings ? `${listings} ${listings === 1 ? "listing" : "listings"}` : "",
  ].filter(Boolean);
  return `Explored: ${parts.join(", ")}`;
});
</script>

<style scoped>
.tool-call-batch {
  margin: 0.35rem 0;
  padding: 0.55rem 0.7rem;
  font-size: 0.82rem;
  border-left-width: 3px;
  border-left-style: solid;
  border-left-color: rgba(33, 150, 243, 0.5);
}
.tool-call-batch--error {
  border-left-color: rgb(var(--v-theme-error));
}
.tool-call-batch__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.2rem;
}
.tool-call-batch__title {
  font-weight: 600;
}
.tool-call-batch__status {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  flex-shrink: 0;
}
.tool-call-batch__time {
  opacity: 0.45;
  font-variant-numeric: tabular-nums;
  font-size: 0.78rem;
}
.tool-call-batch__row {
  display: flex;
  gap: 0.5rem;
  width: 100%;
  min-width: 0;
  padding: 0.05rem 0;
  text-align: left;
  font-family: ui-monospace, monospace;
  font-size: 0.78rem;
  opacity: 0.85;
  cursor: pointer;
}
.tool-call-batch__row:hover {
  opacity: 1;
}
.tool-call-batch__row--error {
  color: rgb(var(--v-theme-error));
}
.tool-call-batch__name {
  flex-shrink: 0;
  min-width: 3.5rem;
  opacity: 0.7;
}
.tool-call-batch__detail {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
