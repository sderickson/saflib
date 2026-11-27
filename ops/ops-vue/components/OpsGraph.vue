<template>
  <div v-if="!link.isError.value && !loadFailed" class="ops-graph">
    <img
      v-if="objectUrl"
      :src="objectUrl"
      :alt="title"
      :width="size.width"
      :height="size.height"
      class="ops-graph-img"
    />
    <v-skeleton-loader v-else type="image" :width="size.width" :height="size.height" />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import { useOpsGraphLink } from "../requests/queries.ts";

const props = withDefaults(
  defineProps<{ query: string; title: string; hours?: number; width?: number; height?: number }>(),
  { hours: 24, width: 560, height: 240 },
);

// The renderer's limits (the API rejects smaller); a small slot scales the image down.
const size = {
  width: Math.min(1600, Math.max(200, Math.round(props.width))),
  height: Math.min(1000, Math.max(120, Math.round(props.height))),
};

// Minted through the same endpoint agents use; the PNG URL needs no session.
const link = useOpsGraphLink({
  query: props.query,
  title: props.title,
  start: new Date(Date.now() - props.hours * 3_600_000).toISOString(),
  width: size.width,
  height: size.height,
});

// The PNG lives on the API's origin, which the admin SPA's CSP doesn't allow
// for img-src. Fetch it (connect-src allows the API) and show it as a blob:
// URL, which img-src does allow, rather than widening every product's CSP.
const objectUrl = ref<string | null>(null);
const loadFailed = ref(false);
let current = 0;

function setObjectUrl(url: string | null) {
  if (objectUrl.value) URL.revokeObjectURL(objectUrl.value);
  objectUrl.value = url;
}

watch(
  () => link.data.value?.graph_link.png_url,
  async (pngUrl) => {
    const request = ++current;
    loadFailed.value = false;
    if (!pngUrl) return setObjectUrl(null);
    try {
      const res = await fetch(pngUrl, { credentials: "omit" });
      if (!res.ok) throw new Error(`graph PNG: HTTP ${res.status}`);
      const blob = await res.blob();
      if (request === current) setObjectUrl(URL.createObjectURL(blob));
    } catch {
      if (request === current) loadFailed.value = true;
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  current++;
  setObjectUrl(null);
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
