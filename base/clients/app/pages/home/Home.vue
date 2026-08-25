<template>
  <ContentWidth variant="medium" class="py-10">
    <h1 class="text-h4 mb-2">{{ t(strings.title) }}</h1>
    <i18n-t
      v-if="email"
      scope="global"
      class="text-body-2 mb-6 d-block"
      :keypath="lookupTKey(strings.logged_in_as)"
    >
      <template #email>{{ email }}</template>
    </i18n-t>
  </ContentWidth>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { ContentWidth } from "@saflib/vue/components";
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

const email = computed(() => kratosEmailFromSession(sessionQuery.data.value));

const accountHref = linkToHrefWithHost(accountLinks.home);
</script>
