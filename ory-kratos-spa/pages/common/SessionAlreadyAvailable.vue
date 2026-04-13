<template>
  <div>
    <h1 v-if="authApp.showFlowHeaders" class="text-h4 mb-2">
      {{ t(strings.title) }}
    </h1>
    <p class="text-body-1 mb-4">{{ t(strings.body) }}</p>
    <div class="d-flex flex-wrap ga-3">
      <v-btn
        color="primary"
        size="large"
        variant="tonal"
        tag="a"
        :href="postAuthFallbackHref"
        :aria-label="t(strings.continue_aria)"
      >
        {{ t(strings.continue) }}
      </v-btn>
      <v-btn
        size="large"
        variant="outlined"
        :loading="pending"
        :aria-label="t(strings.log_out_aria)"
        @click="startBrowserLogout"
      >
        {{ t(strings.log_out) }}
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useReverseT } from "@saflib/ory-kratos-spa/i18n";
import { useAuthAppConfig } from "../../configureAuthApp.ts";
import { session_already_available as strings } from "./SessionAlreadyAvailable.strings.ts";
import { useAuthPostAuthFallbackHref } from "../../authFallbackInject.ts";
import { useKratosBrowserLogout } from "../registration/useKratosBrowserLogout.ts";

const route = useRoute();
const { t } = useReverseT();
const authApp = useAuthAppConfig();
const postAuthFallbackHref = useAuthPostAuthFallbackHref();

const afterLogoutReturnTo = computed(
  () => `${window.location.origin}${route.fullPath}`,
);

const { pending, startBrowserLogout } = useKratosBrowserLogout({
  afterLogoutReturnTo,
});
</script>
