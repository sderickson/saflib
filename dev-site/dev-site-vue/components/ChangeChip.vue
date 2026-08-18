<template>
  <v-chip
    v-if="change"
    :color="changeColor(change)"
    size="x-small"
    variant="tonal"
    class="change-chip"
  >
    {{ change === "modified" ? "changed" : change }}
  </v-chip>
</template>

<script setup lang="ts">
import { changeColor, type ChangeKind } from "../package-change-overlay.ts";

defineProps<{
  change?: ChangeKind;
}>();
</script>

<style scoped>
.change-chip {
  flex-shrink: 0;
}
</style>
