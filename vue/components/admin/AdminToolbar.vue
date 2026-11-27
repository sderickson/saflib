<template>
  <div class="saf-admin-toolbar" role="toolbar" :aria-label="label">
    <div class="saf-admin-toolbar__row">
      <div class="saf-admin-toolbar__main">
        <slot />
      </div>
      <div class="saf-admin-toolbar__actions">
        <slot name="actions" />
        <v-btn
          v-if="$slots.filters"
          icon
          size="small"
          variant="text"
          :color="activeFilters ? 'primary' : undefined"
          :aria-label="open ? strings.hideFilters : strings.showFilters"
          :aria-expanded="open"
          :title="open ? strings.hideFilters : strings.showFilters"
          data-test="toolbar-filters"
          @click="open = !open"
        >
          <v-badge :model-value="activeFilters > 0" :content="activeFilters" color="primary" floating>
            <v-icon icon="mdi-filter-variant" />
          </v-badge>
        </v-btn>
      </div>
    </div>
    <v-expand-transition>
      <div v-if="$slots.filters" v-show="open" class="saf-admin-toolbar__filters" data-test="toolbar-filter-panel">
        <slot name="filters" />
      </div>
    </v-expand-transition>
  </div>
</template>

<script setup lang="ts">
/**
 * An admin page's controls in one row: the main field (usually search) grows,
 * icon actions sit on the right, and anything else folds into a filter
 * panel behind a filter button (badged with how many filters are set; it
 * starts open when any are).
 */
import { ref } from "vue";

const props = withDefaults(defineProps<{ label?: string; activeFilters?: number }>(), {
  label: "Filters",
  activeFilters: 0,
});

const strings = { showFilters: "Show filters", hideFilters: "Hide filters" };
const open = ref(props.activeFilters > 0);
</script>

<style>
.saf-admin-toolbar {
  margin-bottom: 12px;
}
.saf-admin-toolbar__row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.saf-admin-toolbar__main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
.saf-admin-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}
.saf-admin-toolbar__filters {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
  padding-top: 8px;
  align-items: center;
}
</style>
