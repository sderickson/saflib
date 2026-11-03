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

    <template v-if="needsVerification">
      <p class="text-body-2 mb-4">{{ t(strings.verify_email_prompt) }}</p>
      <v-btn color="primary" variant="flat" :href="verifyEmailHref">
        {{ t(strings.verify_email_link) }}
      </v-btn>
    </template>
    <p v-else-if="email" class="text-body-2 text-medium-emphasis mb-0">
      {{ t(strings.email_verified) }}
    </p>
  </ContentWidth>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { ContentWidth } from "@saflib/vue/components";
import { linkToHrefWithHost } from "@saflib/links";
import { accountLinks, appLinks } from "@saflib/base-links";
import {
  identityNeedsEmailVerification,
  kratosEmailFromSession,
} from "@saflib/ory-kratos-sdk";
import { parseVerificationFlowIdFromQuery } from "@saflib/ory-kratos-spa/verification";
import { useReverseT } from "@saflib/base-app-spa/i18n";
import { useHomeLoader } from "./Home.loader.ts";
import { home as strings } from "./Home.strings.ts";

const { t, lookupTKey } = useReverseT();
const route = useRoute();
const { sessionQuery } = useHomeLoader();

if (!sessionQuery.data.value?.identity) {
  throw new Error("Failed to load session");
}

const email = computed(() => kratosEmailFromSession(sessionQuery.data.value));

const needsVerification = computed(() =>
  identityNeedsEmailVerification(sessionQuery.data.value?.identity),
);

const verificationFlowId = computed(() =>
  parseVerificationFlowIdFromQuery(route.query),
);

const verifyEmailHref = computed(() => {
  const returnTo = linkToHrefWithHost(appLinks.home);
  if (verificationFlowId.value) {
    return linkToHrefWithHost(accountLinks.verification, {
      params: {
        flow: verificationFlowId.value,
        return_to: returnTo,
      },
    });
  }
  return linkToHrefWithHost(accountLinks.verifyEmail, {
    params: {
      return_to: returnTo,
    },
  });
});
</script>
