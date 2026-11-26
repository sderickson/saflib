<template>
  <v-chip
    v-if="digest"
    size="small"
    variant="tonal"
    :color="count > 0 ? (bad ? 'error' : 'warning') : 'success'"
    :to="to"
    data-test="health-pill"
  >
    <span class="health-pill__dot" aria-hidden="true" />
    {{ count > 0 ? `${count} need${count === 1 ? "s" : ""} attention` : "All clear" }}
  </v-chip>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { RouteLocationRaw } from "vue-router";
import { useOpsDigest } from "../requests/queries.ts";

defineProps<{ to?: RouteLocationRaw }>();

const query = useOpsDigest();
const digest = computed(() => query.data.value?.digest);
const count = computed(() => digest.value?.summary.attention.length ?? 0);
const bad = computed(() => digest.value?.summary.attention.some((a) => a.tone === "bad") ?? false);
</script>

<style scoped>
.health-pill__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
  background: currentColor;
}
</style>
