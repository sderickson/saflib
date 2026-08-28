<script setup lang="ts">
import { computed } from "vue";
import { DynamicBaseLayout } from "@saflib/base-clients-common/components";
import { ContentWidth } from "@saflib/vue/components";
import { linkToHrefWithHost } from "@saflib/links";
import { appLinks } from "@saflib/base-links";
import { configureAuthApp } from "@saflib/ory-kratos-spa";

configureAuthApp({
  requireMfaAfterLogin: false,
  postAuthFallbackHref: computed(() => linkToHrefWithHost(appLinks.home)),
  postRegisterFallbackHref: computed(() => linkToHrefWithHost(appLinks.home)),
});
</script>

<template>
  <DynamicBaseLayout>
    <ContentWidth variant="narrow" class="auth-spa-container py-8 py-md-12">
      <router-view />
    </ContentWidth>
  </DynamicBaseLayout>
</template>

<style scoped>
.auth-spa-container {
  min-height: calc(100vh - 90px);
}
</style>
