<template>
  <div>
    <h1 class="text-h5 mb-4">{{ t(pageTitle) }}</h1>
    <div v-if="section === 'totp' || section === 'mfa'" class="mb-6">
      <p class="text-body-1 text-medium-emphasis mb-3">
        {{ t(strings.mfa_required) }}
      </p>
      <p class="text-body-1 text-medium-emphasis mb-0">
        {{ t(mfaLinked ? strings.mfa_intro_linked : strings.mfa_intro_setup) }}
      </p>
    </div>
    <SettingsSectionAsync :section="section" />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useKratosSession } from "@saflib/ory-kratos-sdk";
import { SettingsSectionAsync } from "@saflib/ory-kratos-spa/settings";
import type { SettingsTabQueryValue } from "@saflib/ory-kratos-spa/settings";
import { useReverseT } from "@saflib/base-account-spa/i18n";
import { sessionHasSecondFactorAuthenticationMethod } from "./AccountSettingsSection.logic.ts";
import { account_settings_section as strings } from "./AccountSettingsSection.strings.ts";

const props = defineProps<{
  section: Extract<
    SettingsTabQueryValue,
    "email" | "password" | "totp" | "mfa" | "sessions"
  >;
}>();

const { t } = useReverseT();
const { data: session } = useKratosSession();

const mfaLinked = computed(() =>
  sessionHasSecondFactorAuthenticationMethod(session.value),
);

const pageTitle = computed(() => {
  switch (props.section) {
    case "email":
      return strings.email_title;
    case "password":
      return strings.password_title;
    case "totp":
    case "mfa":
      return mfaLinked.value ? strings.mfa_title : strings.mfa_title_setup;
    case "sessions":
      return strings.sessions_title;
  }
});
</script>
