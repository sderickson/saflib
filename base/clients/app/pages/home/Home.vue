<template>
  <v-container class="py-10">
    <v-row justify="center">
      <v-col cols="12" md="8">
        <h1 class="text-h4 mb-2">{{ t(strings.title) }}</h1>
        <p class="text-body-1 text-medium-emphasis mb-6">
          {{ t(strings.subtitle) }}
        </p>
        <i18n-t
          v-if="email"
          scope="global"
          class="text-body-2 mb-6 d-block"
          :keypath="lookupTKey(strings.logged_in_as)"
        >
          <template #email>{{ email }}</template>
        </i18n-t>
        <v-btn color="primary" :href="accountHref" variant="flat">
          {{ t(strings.account_cta) }}
        </v-btn>
        <p class="text-caption text-medium-emphasis mt-2 mb-0">
          {{ t(strings.account_cta_hint) }}
        </p>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { linkToHrefWithHost } from "@saflib/links";
import { accountLinks } from "@saflib/base-links";
import { kratosEmailFromSession } from "@saflib/ory-kratos-sdk";
import { useReverseT } from "@saflib/base-app-spa/i18n";
import { useHomeLoader } from "./Home.loader.ts";
import { home as strings } from "./Home.strings.ts";

const { t, lookupTKey } = useReverseT();
const { sessionQuery } = useHomeLoader();

if (!sessionQuery.data.value?.identity) {
  throw new Error("Failed to load session");
}

const email = computed(() =>
  kratosEmailFromSession(sessionQuery.data.value),
);

const accountHref = linkToHrefWithHost(accountLinks.home);
</script>
