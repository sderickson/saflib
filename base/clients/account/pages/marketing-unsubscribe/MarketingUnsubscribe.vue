<template>
  <ContentWidth variant="narrow" class="py-12">
    <h1 class="text-h5 mb-4">{{ t(strings.title) }}</h1>

    <template v-if="done">
      <v-alert type="success" variant="tonal" :text="t(strings.done)" />
    </template>

    <template v-else-if="email">
      <i18n-t
        scope="global"
        :keypath="lookupTKey(strings.ask)"
        tag="p"
        class="text-body-1 text-medium-emphasis mb-6"
      >
        <template #email>
          <strong>{{ email }}</strong>
        </template>
      </i18n-t>

      <v-alert
        v-if="submitError"
        type="error"
        variant="tonal"
        density="compact"
        class="mb-4"
        :text="submitError"
      />

      <v-btn
        color="primary"
        variant="flat"
        :loading="isPending"
        :disabled="isPending"
        @click="unsubscribe"
      >
        {{ t(strings.confirm) }}
      </v-btn>
    </template>

    <p v-else class="text-body-1 text-medium-emphasis">
      {{ t(strings.ask_no_email) }}
    </p>
  </ContentWidth>
</template>

<script setup lang="ts">
import { useUnsubscribeMarketingEmailsUserConfigsMutation } from "@saflib/base-sdk/requests/user-configs/unsubscribe-marketing";
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { ContentWidth } from "@saflib/vue/components";
import { useReverseT } from "@saflib/base-account-spa/i18n";
import { marketing_unsubscribe as strings } from "./MarketingUnsubscribe.strings.ts";
import { parseMarketingUnsubscribeEmail } from "./MarketingUnsubscribe.logic.ts";

const { t, lookupTKey } = useReverseT();
const route = useRoute();
const mutation = useUnsubscribeMarketingEmailsUserConfigsMutation();

const email = computed(() =>
  parseMarketingUnsubscribeEmail(route.query, route.fullPath),
);
const done = ref(false);
const submitError = ref<string | null>(null);
const isPending = computed(() => mutation.isPending.value);

async function unsubscribe() {
  const address = email.value;
  if (!address || isPending.value) {
    return;
  }
  submitError.value = null;
  try {
    await mutation.mutateAsync({ email: address });
    done.value = true;
  } catch {
    submitError.value = t(strings.error);
  }
}
</script>
