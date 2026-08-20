<template>
  <!-- Events are rendered here for playwright tests to assert on -->
  <pre class="d-none" data-testid="events">{{ events }}</pre>

  <TemplatesLayout :logged-in="loggedIn">
    <slot />
  </TemplatesLayout>

  <SnackbarQueue />
</template>

<script setup lang="ts">
import TemplatesLayout from "./TemplatesLayout.vue";
import { events } from "@saflib/vue";
import { SnackbarQueue } from "@saflib/vue/components";

defineProps<{
  loggedIn?: boolean;
}>();
</script>
