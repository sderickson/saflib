<template>
  <div class="saf-admin-section">
    <ContentWidth variant="full" class="saf-admin-section__head">
      <div class="d-flex flex-wrap align-center justify-space-between ga-2">
        <h1 class="text-h4">{{ title }}</h1>
        <slot name="actions" />
      </div>
      <v-tabs class="mt-2" density="compact" :model-value="activeTab" data-test="admin-section-tabs">
        <v-tab v-for="t in tabs" :key="t.to" :value="t.to" :to="t.to" :data-test="`admin-section-tab-${t.to}`">
          {{ t.label }}
          <v-chip v-if="t.badge" size="x-small" variant="tonal" color="error" class="ms-2">{{ t.badge }}</v-chip>
        </v-tab>
      </v-tabs>
    </ContentWidth>
    <router-view />
  </div>
</template>

<script setup lang="ts">
/**
 * A sidebar section made of several admin pages, one per tab (e.g. Logs:
 * Server · Audit). Use it as the component of a parent route whose children
 * are the pages; children may keep absolute paths, so existing links still
 * work. Pages title themselves with AdminPageTitle, which steps aside here.
 */
import { computed, provide } from "vue";
import { useRoute } from "vue-router";
import ContentWidth from "../ContentWidth.vue";
import { adminSectionKey, type AdminSectionTab } from "./admin-section.ts";

const props = defineProps<{ title: string; tabs: AdminSectionTab[] }>();

provide(adminSectionKey, true);

const route = useRoute();
// The longest tab path that prefixes the current one (so /a/b beats /a).
const activeTab = computed(() => {
  const path = route.path;
  return (
    [...props.tabs]
      .sort((a, b) => b.to.length - a.to.length)
      .find((t) => path === t.to || path.startsWith(`${t.to}/`))?.to ?? props.tabs[0]?.to
  );
});
</script>

<style>
.saf-admin-section__head {
  padding-bottom: 0 !important;
}
</style>
