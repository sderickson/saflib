<template>
  <Teleport v-if="section" defer :to="section.subTabsTarget">
    <slot />
  </Teleport>
  <slot v-else />
</template>

<script setup lang="ts">
/**
 * Wrap a page's own tabs (e.g. Issues: Open / Resolved / Ignored). Inside an
 * AdminSection they move into the section's single tab row; elsewhere they
 * render in place.
 */
import { inject } from "vue";
import { adminSectionKey } from "./admin-section.ts";

const section = inject(adminSectionKey, null);
</script>
