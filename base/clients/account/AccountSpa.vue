<script setup lang="ts">
import { computed } from "vue";
import { DynamicBaseLayout } from "@saflib/base-clients-common/components";
import { linkToHrefWithHost } from "@saflib/links";
import { appLinks } from "@saflib/base-links";
import { configureAuthApp } from "@saflib/ory-kratos-spa";

configureAuthApp({
  showFlowHeaders: false,
  postAuthFallbackHref: computed(() => linkToHrefWithHost(appLinks.home)),
});
</script>

<template>
  <DynamicBaseLayout require-auth>
    <router-view />
  </DynamicBaseLayout>
</template>
