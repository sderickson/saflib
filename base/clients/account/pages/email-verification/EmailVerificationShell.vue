<template>
  <ContentWidth variant="narrow" class="py-8">
    <h1 v-if="title" class="text-h4 mb-4">{{ title }}</h1>
    <slot />
  </ContentWidth>
</template>

<script setup lang="ts">
import { ContentWidth } from "@saflib/vue/components";

defineProps<{
  title?: string;
}>();
</script>
