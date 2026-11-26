<template>
  <v-defaults-provider :defaults="adminDefaults">
    <div class="saf-admin">
      <slot />
    </div>
  </v-defaults-provider>
</template>

<script setup lang="ts">
/**
 * Wrap admin page content (inside `v-main`) in this. It sets the admin's
 * Vuetify defaults and styles so every page shares one look: cream page,
 * white panels with a soft border, outlined white inputs, compact tables with
 * small grey headers. Products can retheme through the `--saf-admin-*`
 * variables on `.saf-admin`.
 */
import { adminDefaults } from "./admin-defaults.ts";
</script>

<style>
.saf-admin {
  --saf-admin-surface: #ffffff;
  --saf-admin-border: #eaeaea;
  --saf-admin-row-border: #f2eee2;
  --saf-admin-input-border: #ddd6bf;
  --saf-admin-button-border: #c9ceda;
  --saf-admin-muted: #5e6577;
  --saf-admin-radius: 8px;
}

/* Panels: cards and bare tables are white with a soft border, never a
   theme-coloured (often beige) fill, a shadow, or a dark outline. */
.saf-admin .v-card:not(.v-card--variant-text):not(.v-card--variant-plain),
.saf-admin .saf-admin-panel {
  background: var(--saf-admin-surface);
  border: 1px solid var(--saf-admin-border);
  border-radius: var(--saf-admin-radius);
  box-shadow: none;
  color: rgb(var(--v-theme-on-surface));
}
.saf-admin .v-card .v-card {
  border-radius: 6px;
}
.saf-admin .v-card--variant-outlined {
  border-color: var(--saf-admin-border);
}

.saf-admin .v-table {
  background: var(--saf-admin-surface);
  border: 1px solid var(--saf-admin-border);
  border-radius: var(--saf-admin-radius);
  overflow: hidden;
  font-size: 0.8125rem;
}
/* Inside a panel the panel draws the box. */
.saf-admin .v-card .v-table,
.saf-admin .saf-admin-panel .v-table,
.saf-admin .v-expansion-panel .v-table {
  border: 0;
  border-radius: 0;
  background: transparent;
}
.saf-admin .v-table > .v-table__wrapper > table > thead > tr > th {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--saf-admin-muted);
  white-space: nowrap;
  border-bottom: 1px solid var(--saf-admin-border) !important;
}
.saf-admin .v-table > .v-table__wrapper > table > tbody > tr > td {
  border-bottom: 1px solid var(--saf-admin-row-border) !important;
}
.saf-admin .v-table > .v-table__wrapper > table > tbody > tr:last-child > td {
  border-bottom: 0 !important;
}

/* Controls inside table rows stay well inside the row height. */
.saf-admin .v-table td .v-btn:not(.v-btn--icon) {
  height: 26px;
  padding: 0 8px;
  font-size: 0.8125rem;
  min-width: 0;
}
.saf-admin .v-table td .v-btn--icon {
  width: 28px;
  height: 28px;
}
.saf-admin .v-table td .v-chip {
  height: 20px;
  padding: 0 8px;
  font-size: 0.6875rem;
}
.saf-admin .v-table > .v-table__wrapper > table > tbody > tr > td {
  vertical-align: middle;
}

/* Inputs: white, warm hairline, primary when focused. */
.saf-admin .v-field--variant-outlined {
  background: var(--saf-admin-surface);
  border-radius: 4px;
}
.saf-admin .v-field--variant-outlined .v-field__outline {
  --v-field-border-opacity: 1;
  color: var(--saf-admin-input-border);
}
.saf-admin .v-field--variant-outlined.v-field--focused .v-field__outline {
  color: rgb(var(--v-theme-primary));
}
.saf-admin .v-field--variant-outlined.v-field--error .v-field__outline {
  color: rgb(var(--v-theme-error));
}

/* Expandable lists (e.g. Issues) read as one white panel with row dividers. */
.saf-admin .v-expansion-panels {
  background: var(--saf-admin-surface);
  border: 1px solid var(--saf-admin-border);
  border-radius: var(--saf-admin-radius);
  overflow: hidden;
}
.saf-admin .v-expansion-panel {
  background: var(--saf-admin-surface) !important;
  border-radius: 0 !important;
}
.saf-admin .v-expansion-panel:not(:first-child) {
  border-top: 1px solid var(--saf-admin-row-border);
}
.saf-admin .v-expansion-panel::after {
  display: none;
}
.saf-admin .v-expansion-panel__shadow {
  display: none;
}
.saf-admin .v-expansion-panel-title {
  font-size: 0.875rem;
  min-height: 44px;
  padding: 8px 16px;
}
.saf-admin .v-expansion-panel--active > .v-expansion-panel-title {
  min-height: 44px;
  border-bottom: 1px solid var(--saf-admin-row-border);
}

/* Panel and card titles stay small, whatever the product's global h2/h3. */
.saf-admin .v-card h2,
.saf-admin .v-card h3,
.saf-admin .saf-admin-panel h2,
.saf-admin .saf-admin-panel h3 {
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: normal;
  margin: 0;
}

/* IDs, timestamps and code. */
.saf-admin .saf-admin-mono {
  font-family: ui-monospace, Menlo, monospace;
  font-size: 0.8125rem;
}

/* Empty states: a quiet white panel, not bare or centred text. */
.saf-admin .saf-admin-empty {
  background: var(--saf-admin-surface);
  border: 1px solid var(--saf-admin-border);
  border-radius: var(--saf-admin-radius);
  padding: 20px 16px;
  color: var(--saf-admin-muted);
  font-size: 0.875rem;
}

/* Plain lists (not the nav) sit on a white panel too. */
.saf-admin .v-list:not(.v-list--nav) {
  background: var(--saf-admin-surface);
  border: 1px solid var(--saf-admin-border);
  border-radius: var(--saf-admin-radius);
}
.saf-admin .v-card .v-list:not(.v-list--nav) {
  border: 0;
  border-radius: 0;
}

/* Neutral outlined chips (filters, presets): soft border, not black. */
.saf-admin .v-chip--variant-outlined:not([class*="text-"]) {
  border-color: var(--saf-admin-button-border);
}

/* Secondary buttons: soft grey-blue outline, as in the design. */
.saf-admin .v-btn--variant-outlined:not(.v-btn--icon):not(.text-error):not(.text-warning):not(.text-success) {
  background-color: var(--saf-admin-surface);
  border: 1px solid var(--saf-admin-button-border);
}
</style>
