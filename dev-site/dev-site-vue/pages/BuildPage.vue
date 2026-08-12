<template>
  <v-container class="py-12">
    <v-btn variant="text" :to="hubPath" class="mb-4">← Hub</v-btn>
    <h1 class="text-h4 mb-2">Build</h1>
    <p class="text-body-1 text-medium-emphasis" style="max-width: 36rem">
      Not yet. This will use inventory and gaps (untested packages, thin suites)
      to suggest what to build next.
    </p>
  </v-container>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    hubPath?: string;
  }>(),
  { hubPath: "/" },
);
</script>
