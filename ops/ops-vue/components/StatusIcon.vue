<template>
  <v-icon :icon="icon" :color="color" :size="size" :aria-label="label" role="img" class="status-icon" :class="{ 'text-medium-emphasis': tone === 'todo' }" />
</template>

<script setup lang="ts">
/**
 * Green check, neutral dot, yellow warning or red x: the admin's one way
 * to show ok / todo / warn / bad (health checks' `fail` reads as bad).
 */
import { computed } from "vue";

export type StatusTone = "ok" | "todo" | "warn" | "bad" | "fail";

const props = withDefaults(defineProps<{ tone: StatusTone; size?: string | number }>(), { size: 20 });

const LOOK = {
  ok: { icon: "mdi-check-circle", color: "success", label: "OK" },
  // Work waiting, not a problem: neutral, so warning icons always match the attention count.
  todo: { icon: "mdi-circle-slice-8", color: undefined, label: "To do" },
  warn: { icon: "mdi-alert", color: "warning", label: "Warning" },
  bad: { icon: "mdi-close-circle", color: "error", label: "Needs action" },
} as const;

const look = computed(() => LOOK[props.tone === "fail" ? "bad" : props.tone]);
const icon = computed(() => look.value.icon);
const color = computed(() => look.value.color);
const label = computed(() => look.value.label);
</script>
