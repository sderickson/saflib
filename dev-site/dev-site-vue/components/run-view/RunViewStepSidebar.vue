<template>
  <aside class="run-view__sidebar">
    <div
      v-for="step in steps"
      :key="step.index"
      class="run-view__sidebar-step"
      :class="stepClass(step)"
      @click="emit('select-step', step.index)"
    >
      <div class="run-view__sidebar-step-head">
        <span class="run-view__sidebar-step-index">{{ step.index + 1 }}</span>
        <span class="run-view__sidebar-step-label" :title="step.label ?? step.kind">
          {{ step.label ?? step.kind }}
        </span>
      </div>
      <ul v-if="step.params" class="run-view__sidebar-step-params">
        <li
          v-for="(value, key) in step.params"
          :key="key"
          class="run-view__sidebar-step-param"
          :title="`${key}: ${value}`"
        >
          <span class="run-view__sidebar-step-param-key">{{ key }}:</span> {{ value }}
        </li>
      </ul>
    </div>
  </aside>
</template>

<script setup lang="ts">
defineProps<{
  steps: { index: number; kind: string; label?: string; params?: Record<string, string> }[];
  stepClass: (step: { index: number }) => Record<string, boolean>;
}>();

const emit = defineEmits<{
  "select-step": [index: number];
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
.run-view__sidebar-step-param-key {
  opacity: 0.7;
}
</style>
