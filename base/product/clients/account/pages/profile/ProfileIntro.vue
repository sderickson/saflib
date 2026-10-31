<template>
  <header>
    <h1 class="text-h4 mb-2">{{ t(strings.title) }}</h1>
    <p class="text-body-1 text-medium-emphasis mb-6">
      {{ t(strings.description) }}
    </p>
  </header>
</template>

<script setup lang="ts">
import { profile_intro as strings } from "./Profile.strings.ts";
import { useReverseT } from "@saflib/base-account-spa/i18n";

const { t } = useReverseT();
</script>
