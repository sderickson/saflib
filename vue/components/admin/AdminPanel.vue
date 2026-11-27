<template>
  <section class="saf-admin-panel" :class="{ 'saf-admin-panel--padded': padded }">
    <header v-if="title || $slots.title || $slots.actions" class="saf-admin-panel__header">
      <div class="saf-admin-panel__title">
        <slot name="title">
          <h2 class="text-subtitle-1 font-weight-medium">{{ title }}</h2>
        </slot>
        <p v-if="subtitle" class="text-body-2 text-medium-emphasis">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="saf-admin-panel__actions">
        <slot name="actions" />
      </div>
    </header>
    <div class="saf-admin-panel__body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * The admin's content container: a white panel with a soft border and an
 * optional header row (title, then counts or actions on the right). Put
 * tables in it as-is; set `padded` for prose, forms and key/value lists.
 * Styled by {@link AdminScope}.
 */
defineProps<{
  title?: string;
  subtitle?: string;
  /** Pad the body (off for tables, which run edge to edge). */
  padded?: boolean;
}>();
</script>

<style>
.saf-admin-panel {
  min-width: 0;
  overflow: hidden;
}
.saf-admin-panel__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--saf-admin-border, #eaeaea);
}
.saf-admin-panel__title {
  min-width: 0;
}
.saf-admin-panel__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.saf-admin-panel--padded > .saf-admin-panel__body {
  padding: 14px 16px;
}
</style>
