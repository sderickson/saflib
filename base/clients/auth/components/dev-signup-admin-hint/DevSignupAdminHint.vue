<template>
  <v-alert v-if="showHint" type="info" variant="tonal" class="mb-6">
    <i18n-t
      v-if="adminEmails.length === 1"
      scope="global"
      :keypath="lookupTKey(strings.admin_hint_single)"
    >
      <template #email>{{ adminEmails[0] }}</template>
    </i18n-t>
    <i18n-t
      v-else
      scope="global"
      :keypath="lookupTKey(strings.admin_hint_multiple)"
    >
      <template #emails>{{ adminEmails.join(", ") }}</template>
    </i18n-t>
  </v-alert>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { isDevelopmentDeployment } from "@saflib/vue";
import { getConfiguredAdminEmails } from "@saflib/base-clients-common/utils/site-admin.logic";
import { useReverseT } from "@saflib/base-auth-spa/i18n";
import { dev_signup as strings } from "./DevSignupAdminHint.strings.ts";

const { lookupTKey } = useReverseT();

const adminEmails = getConfiguredAdminEmails();

const showHint = computed(
  () => isDevelopmentDeployment() && adminEmails.length > 0,
);
</script>
