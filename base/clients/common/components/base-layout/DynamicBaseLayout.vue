<template>
  <!-- Events are rendered here for playwright tests to assert on -->
  <pre class="d-none" data-testid="events">{{ events }}</pre>

  <BaseLayout :logged-in="loggedIn">
    <slot />
  </BaseLayout>

  <SnackbarQueue />
</template>

<script setup lang="ts">
import BaseLayout from "./BaseLayout.vue";
import { events } from "@saflib/vue";
import { SnackbarQueue } from "@saflib/vue/components";

defineProps<{
  loggedIn?: boolean;
}>();
</script>
