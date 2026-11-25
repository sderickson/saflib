<template>
  <span class="actor-chip" data-test="actor-chip" :title="title">
    <span class="actor-chip__icon" aria-hidden="true">
      <v-icon size="12" :icon="icon" />
    </span>
    <span class="actor-chip__text">
      {{ kindLabel }}<template v-if="label"> · {{ label }}</template>
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";

export type ActorKind = "cron" | "ops-token" | "webhook" | "system" | "job";

const props = defineProps<{
  /** What kind of non-human actor this is. */
  kind: ActorKind;
  /** Which one, e.g. the cron job or token name. */
  label?: string;
  /** Extra detail on hover, e.g. "enabled by …". */
  title?: string;
}>();

const KINDS: Record<ActorKind, { label: string; icon: string }> = {
  cron: { label: "cron", icon: "mdi-clock-outline" },
  "ops-token": { label: "ops token", icon: "mdi-key-variant" },
  webhook: { label: "webhook", icon: "mdi-webhook" },
  system: { label: "system", icon: "mdi-cog" },
  job: { label: "job", icon: "mdi-robot-outline" },
};

const kindLabel = computed(() => KINDS[props.kind].label);
const icon = computed(() => KINDS[props.kind].icon);
</script>

<style scoped>
/* Same slot as UserRef, but a square icon instead of a round avatar, so a
   cron job is never mistaken for a person. */
.actor-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  max-width: 100%;
  vertical-align: middle;
}
.actor-chip__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  border-radius: 5px;
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
}
.actor-chip__text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
