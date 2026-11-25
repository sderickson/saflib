<template>
  <ContentWidth variant="full">
    <h1 class="text-h4 mb-2">{{ strings.title }}</h1>
    <p class="text-body-2 mb-6">{{ strings.intro }}</p>

    <v-card variant="outlined">
      <v-card-title class="text-subtitle-1">{{ strings.smokeHeading }}</v-card-title>
      <v-card-text>
        <p class="text-body-2 mb-4">{{ strings.smokeIntro }}</p>
        <ErrorSmokeWidgets />
      </v-card-text>
    </v-card>
  </ContentWidth>
</template>

<script setup lang="ts">
import { ContentWidth } from "@saflib/vue/components";
import ErrorSmokeWidgets from "@saflib/errors-vue/pages/ErrorSmokeWidgets.vue";
import { ops_diagnostics as strings } from "./Diagnostics.strings.ts";
</script>
