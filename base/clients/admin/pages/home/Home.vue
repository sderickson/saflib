<template>
  <v-container>
    <h1>{{ t(strings.title) }}</h1>
    <p>{{ t(strings.description) }}</p>

    <div class="mt-4 text-body-2">
      <p class="text-medium-emphasis mb-1">{{ t(strings.gitHashesHeading) }}</p>
      <p class="mb-0">
        <span class="text-medium-emphasis">{{ t(strings.gitHashRoot) }}:</span>
        <code class="ms-1">{{ gitHashes.root }}</code>
      </p>
      <p class="mb-0">
        <span class="text-medium-emphasis">{{ t(strings.gitHashSaflib) }}:</span>
        <code class="ms-1">{{ gitHashes.saflib }}</code>
      </p>
    </div>

    <div class="mt-4">
      <ErrorSmokeWidgets subdomain="base" />
    </div>
  </v-container>
</template>

<script setup lang="ts">
import ErrorSmokeWidgets from "@saflib/errors-vue/pages/ErrorSmokeWidgets.vue";
import { getGitHashes } from "@saflib/vue";
import { home as strings } from "./Home.strings.ts";
import { useHomeLoader } from "./Home.loader.ts";
import { useReverseT } from "@saflib/base-admin-spa/i18n";

const { t } = useReverseT();

useHomeLoader();

const gitHashes = getGitHashes();
</script>
