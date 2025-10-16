<template>
  <span v-if="displayValue">
    <span class="text-body-2 text-medium-emphasis mr-1">1</span>
    <span>{{ displayValue }}</span>
  </span>
  <span v-else-if="showPlaceholder" class="text-medium-emphasis">
    {{ placeholder }}
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { fromE164 } from "./phone-utils.ts";

interface Props {
  value?: string;
  placeholder?: string;
  showPlaceholder?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  value: "",
  placeholder: "(555) 123-4567",
  showPlaceholder: false,
});

const displayValue = computed(() => {
  if (!props.value) return "";
  return fromE164(props.value);
});
</script>

<style scoped></style>
