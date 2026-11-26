<template>
  <v-icon :icon="icon" :color="color" :size="size" :aria-label="label" role="img" class="status-icon" />
</template>

<script setup lang="ts">
/**
 * Green check, yellow warning or red x: the admin's one way to show
 * ok / warn / bad (health checks' `fail` reads as bad).
 */
import { computed } from "vue";

export type StatusTone = "ok" | "warn" | "bad" | "fail";

const props = withDefaults(defineProps<{ tone: StatusTone; size?: string | number }>(), { size: 20 });

const LOOK = {
  ok: { icon: "mdi-check-circle", color: "success", label: "OK" },
  warn: { icon: "mdi-alert", color: "warning", label: "Warning" },
  bad: { icon: "mdi-close-circle", color: "error", label: "Needs action" },
} as const;

const look = computed(() => LOOK[props.tone === "fail" ? "bad" : props.tone]);
const icon = computed(() => look.value.icon);
const color = computed(() => look.value.color);
const label = computed(() => look.value.label);
</script>
