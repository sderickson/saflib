<template>
  <!-- Events are rendered here for playwright tests to assert on -->
  <pre class="d-none" data-testid="events">{{ events }}</pre>

  <AdminLayout :groups="groups" :repos="repos">
    <template v-if="$slots.chips" #chips>
      <slot name="chips" />
    </template>
    <slot />
  </AdminLayout>

  <SnackbarQueue />
</template>

<script setup lang="ts">
import AdminLayout from "./AdminLayout.vue";
import { events } from "@saflib/vue";
import { SnackbarQueue } from "@saflib/vue/components";
import type { BuildRepoUrls } from "@saflib/ops-vue";
import type { AdminNavGroup } from "./admin-nav.ts";

defineProps<{
  groups: AdminNavGroup[];
  repos?: BuildRepoUrls;
}>();
</script>
