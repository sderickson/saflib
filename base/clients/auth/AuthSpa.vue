<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { DynamicBaseLayout } from "@saflib/base-clients-common/components";
import { ContentWidth } from "@saflib/vue/components";
import { linkToHrefWithHost } from "@saflib/links";
import { appLinks } from "@saflib/base-links";
import { authLinks } from "@saflib/ory-kratos-sdk/links";
import { configureAuthApp } from "@saflib/ory-kratos-spa";
import DevSignupAdminHint from "./DevSignupAdminHint.vue";

configureAuthApp({
  requireMfaAfterLogin: false,
  postAuthFallbackHref: computed(() => linkToHrefWithHost(appLinks.home)),
  postRegisterFallbackHref: computed(() => linkToHrefWithHost(appLinks.home)),
});

const route = useRoute();
const showDevSignupHint = computed(() => {
  const path = route.path;
  return (
    path === authLinks.newRegistration.path ||
    path === authLinks.registration.path
  );
});
</script>

<template>
  <DynamicBaseLayout>
    <ContentWidth variant="narrow" class="auth-spa-container py-8 py-md-12">
      <DevSignupAdminHint v-if="showDevSignupHint" />
      <router-view />
    </ContentWidth>
  </DynamicBaseLayout>
</template>

<style scoped>
.auth-spa-container {
  min-height: calc(100vh - 90px);
}
</style>
