<template>
  <h1 v-if="!inSection" class="text-h4"><slot /></h1>
</template>

<script setup lang="ts">
/**
 * An admin page's heading. Inside an AdminSection the section's title and
 * tabs already say where you are, so it renders nothing.
 */
import { inject } from "vue";
import { adminSectionKey } from "./admin-section.ts";

const inSection = inject(adminSectionKey, false);
</script>
