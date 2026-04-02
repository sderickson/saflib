<template>
  <!-- Events are rendered here for playwright tests to assert on -->
  <pre class="d-none" data-testid="events">{{ events }}</pre>

  <__ProductName__Layout :logged-in="loggedIn">
    <slot />
  </__ProductName__Layout>

  <SnackbarQueue />
</template>

<script setup lang="ts">
import __ProductName__Layout from "./__ProductName__Layout.vue";
import { events } from "@saflib/vue";
import { SnackbarQueue } from "@saflib/vue/components";

defineProps<{
  loggedIn?: boolean;
}>();
</script>
