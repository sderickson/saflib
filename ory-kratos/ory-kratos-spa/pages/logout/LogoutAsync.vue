<script setup lang="ts">
import { onMounted } from "vue";
import { useRoute } from "vue-router";
import {
  BrowserLogoutFlowCreated,
  createBrowserLogoutFlow,
} from "@saflib/ory-kratos-sdk";
import { useAuthLoggedOutRootFallbackHref } from "../../authFallbackInject.ts";
import { useAuthOnBeforeLogout } from "../../configureAuthApp.ts";

const route = useRoute();
const onBeforeLogout = useAuthOnBeforeLogout();

const rootHomeFallbackHref = useAuthLoggedOutRootFallbackHref();
onMounted(async () => {
  onBeforeLogout?.();
  const q = route.query.return_to;
  const fromQuery = typeof q === "string" && q.trim() ? q.trim() : undefined;
  const returnTo = fromQuery ?? rootHomeFallbackHref.value;
  const result = await createBrowserLogoutFlow(returnTo);
  if (!(result instanceof BrowserLogoutFlowCreated)) {
    throw new Error("Browser logout failed");
  }
  window.location.assign(result.flow.logout_url);
});
</script>

<template>
  <div class="d-flex justify-center align-center flex-column fill-height">
    <v-progress-circular
      indeterminate
      size="64"
      color="primary"
      class="mt-16 mb-4"
    />
    <div class="text-h6">Signing out…</div>
  </div>
</template>
