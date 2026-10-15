<template>
  <aside class="run-view__sidebar">
    <template v-for="item in items" :key="item.key">
      <div
        v-if="item.type === 'step'"
        class="run-view__sidebar-step"
        :class="stepClass(item.step)"
        @click="emit('select-step', item.step.index)"
      >
        <div class="run-view__sidebar-step-head">
          <span class="run-view__sidebar-step-index">{{ item.step.index + 1 }}</span>
          <span class="run-view__sidebar-step-label" :title="item.step.label ?? item.step.kind">
            {{ item.step.label ?? item.step.kind }}
          </span>
        </div>
        <ul v-if="item.step.params" class="run-view__sidebar-step-params">
          <li
            v-for="(value, key) in item.step.params"
            :key="key"
            class="run-view__sidebar-step-param"
            :title="`${key}: ${value}`"
          >
            <span class="run-view__sidebar-step-param-key">{{ key }}:</span> {{ value }}
          </li>
        </ul>
      </div>
      <div
        v-else
        class="run-view__sidebar-message"
        :title="item.message.content"
        @click="emit('select-message', item.message.seq)"
      >
        <v-icon icon="mdi-message-text-outline" size="14" class="run-view__sidebar-message-icon" />
        <span class="run-view__sidebar-message-text">{{ item.message.content }}</span>
        <span class="run-view__sidebar-message-time">{{ formatLogTime(item.message.created_at) }}</span>
      </div>
    </template>
  </aside>
</template>

<script setup lang="ts">
import { formatLogTime } from "../../format-log-time.ts";
import type { SidebarItem } from "./run-view.logic.ts";

defineProps<{
  items: SidebarItem[];
  stepClass: (step: { index: number }) => Record<string, boolean>;
}>();

const emit = defineEmits<{
  "select-step": [index: number];
  "select-message": [seq: number];
}>();
</script>

<style scoped>
.run-view__sidebar {
  flex: 0 0 220px;
  overflow-y: auto;
  border-right: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  padding: 0.5rem 0;
}
.run-view__sidebar-step {
  padding: 0.4rem 0.75rem;
  font-size: 0.8rem;
  cursor: pointer;
  border-left: 3px solid transparent;
}
.run-view__sidebar-step:hover {
  background: rgba(128, 128, 128, 0.08);
}
.run-view__sidebar-step--done {
  background: rgba(var(--v-theme-success), 0.12);
}
.run-view__sidebar-step--running {
  background: rgba(var(--v-theme-warning), 0.16);
}
.run-view__sidebar-step--active {
  border-left-color: rgb(var(--v-theme-primary));
  font-weight: 600;
}
.run-view__sidebar-step-head {
  display: flex;
  gap: 0.5rem;
}
.run-view__sidebar-step-index {
  opacity: 0.5;
}
.run-view__sidebar-step-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.run-view__sidebar-step-params {
  margin: 0.2rem 0 0 1.25rem;
  padding: 0;
  list-style: disc;
  opacity: 0.7;
}
.run-view__sidebar-step-param {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.72rem;
}
.run-view__sidebar-message {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  padding: 0.3rem 0.75rem 0.3rem 1.6rem;
  font-size: 0.75rem;
  cursor: pointer;
  border-left: 3px solid transparent;
  opacity: 0.85;
}
.run-view__sidebar-message:hover {
  background: rgba(128, 128, 128, 0.08);
}
.run-view__sidebar-message-icon {
  flex: 0 0 auto;
  align-self: center;
  opacity: 0.6;
}
.run-view__sidebar-message-text {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-style: italic;
}
.run-view__sidebar-message-time {
  flex: 0 0 auto;
  opacity: 0.5;
  font-size: 0.7rem;
  font-variant-numeric: tabular-nums;
}
.run-view__sidebar-step-param-key {
  opacity: 0.7;
}
</style>
