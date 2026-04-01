<template>
  <div>
    <h1 class="text-h4 mb-2">{{ t(strings.title) }}</h1>
  </div>
</template>

<script setup lang="ts">
import { useReverseT } from "@saflib/ory-kratos-spa/i18n";
import { settings_intro as strings } from "./SettingsIntro.strings.ts";

const { t } = useReverseT();
</script>
