<template>
  <div class="saf-admin-section">
    <ContentWidth variant="full" class="saf-admin-section__head">
      <!-- One row: the section's name (not a tab), its pages, then the
           current page's own tabs (AdminSubTabs), then actions. -->
      <div class="saf-admin-section__bar">
        <h1 class="saf-admin-section__title">{{ title }}</h1>
        <v-tabs density="compact" :model-value="activeTab" class="flex-shrink-0" data-test="admin-section-tabs">
          <v-tab v-for="t in tabs" :key="t.to" :value="t.to" :to="t.to" :data-test="`admin-section-tab-${t.to}`">
            {{ t.label }}
            <v-chip v-if="t.badge" size="x-small" variant="tonal" color="error" class="ms-2">{{ t.badge }}</v-chip>
          </v-tab>
        </v-tabs>
        <div :id="subTabsId" class="saf-admin-section__subtabs" />
        <div class="ms-auto"><slot name="actions" /></div>
      </div>
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
import { computed, provide, useId } from "vue";
import { useRoute } from "vue-router";
import ContentWidth from "../ContentWidth.vue";
import { adminSectionKey, type AdminSectionTab } from "./admin-section.ts";

const props = defineProps<{ title: string; tabs: AdminSectionTab[] }>();

const subTabsId = `saf-admin-subtabs-${useId()}`;
provide(adminSectionKey, { subTabsTarget: `#${subTabsId}` });

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
.saf-admin-section__bar {
  display: flex;
  align-items: center;
  gap: 4px 12px;
  overflow-x: auto;
  border-bottom: 1px solid var(--saf-admin-border, #eaeaea);
}
.saf-admin-section__title {
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.2;
  margin: 0 12px 0 0;
  white-space: nowrap;
}
.saf-admin-section__subtabs:not(:empty) {
  display: flex;
  align-items: center;
  padding-left: 12px;
  border-left: 1px solid var(--saf-admin-border, #eaeaea);
}
/* A page's own tabs, when they sit in the section's row. */
.saf-admin-section__subtabs .v-tabs {
  margin: 0 !important;
}
.saf-admin-section__bar .v-tab {
  text-transform: none;
  letter-spacing: normal;
  font-size: 0.875rem;
  min-width: 0;
  padding: 0 12px;
}
</style>
