<template>
  <div v-if="!link.isError.value" class="ops-graph">
    <img
      v-if="link.data.value"
      :src="link.data.value.graph_link.png_url"
      :alt="title"
      :width="width"
      :height="height"
      class="ops-graph-img"
    />
    <v-skeleton-loader v-else type="image" :width="width" :height="height" />
  </div>
</template>

<script setup lang="ts">
import { useOpsGraphLink } from "../requests/queries.ts";

const props = withDefaults(
  defineProps<{ query: string; title: string; hours?: number; width?: number; height?: number }>(),
  { hours: 24, width: 560, height: 240 },
);

// Minted through the same endpoint agents use; the PNG URL needs no session.
const link = useOpsGraphLink({
  query: props.query,
  title: props.title,
  start: new Date(Date.now() - props.hours * 3_600_000).toISOString(),
  width: props.width,
  height: props.height,
});
</script>

<style scoped>
.ops-graph-img {
  max-width: 100%;
  height: auto;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 4px;
}
</style>
