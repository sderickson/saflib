<template>
  <p class="compare-spec-empty text-body-2 text-medium-emphasis">
    Nothing in the spec view changed for this scope.
    <button type="button" class="compare-spec-empty__link" @click="emit('open-diff')">
      Open Diff tab
    </button>
    to see raw git changes.
  </p>
</template>

<script setup lang="ts">
const emit = defineEmits<{ "open-diff": [] }>();
</script>

<style scoped>
.compare-spec-empty__link {
  background: none;
  border: 0;
  padding: 0;
  color: rgb(var(--v-theme-primary));
  cursor: pointer;
  font: inherit;
  text-decoration: underline;
}
</style>
