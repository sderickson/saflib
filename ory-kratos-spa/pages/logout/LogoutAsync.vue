<script setup lang="ts">
import { onMounted } from "vue";
import { useRoute } from "vue-router";
import { useQueryClient } from "@tanstack/vue-query";
import {
  BrowserLogoutFlowCreated,
  createBrowserLogoutFlowQueryOptions,
} from "@saflib/ory-kratos-sdk";
import { useAuthLoggedOutRootFallbackHref } from "../../authFallbackInject.ts";

const route = useRoute();
const queryClient = useQueryClient();

const rootHomeFallbackHref = useAuthLoggedOutRootFallbackHref();
onMounted(async () => {
  const q = route.query.return_to;
  const fromQuery = typeof q === "string" && q.trim() ? q.trim() : undefined;
  const returnTo = fromQuery ?? rootHomeFallbackHref.value;
  const result = await queryClient.fetchQuery({
    ...createBrowserLogoutFlowQueryOptions({ returnTo }),
    staleTime: 0,
  });
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
