<template>
  <div v-if="showMfaSetupRequired && flow" class="my-4">
    <v-alert type="warning" variant="tonal" prominent>
      <div class="text-h6 mb-2">{{ t(login_mfa_setup_required.title) }}</div>
      <p class="text-body-1 mb-4">{{ t(login_mfa_setup_required.body) }}</p>
      <v-btn color="primary" variant="flat" :href="settingsHref">
        {{ t(login_mfa_setup_required.cta) }}
      </v-btn>
    </v-alert>
  </div>
  <LoginFlowForm
    v-else-if="queryData instanceof LoginFlowFetched && flow"
    :flow="flow"
  />
  <FlowGonePanel
    v-else-if="queryData instanceof FlowGone"
    restart-path="/new-login"
    :result="queryData"
  />
  <CsrfViolationPanel
    v-else-if="queryData instanceof SecurityCsrfViolation"
    restart-path="/new-login"
    :result="queryData"
  />
  <UnhandledResponsePanel v-else :result="queryData" />
</template>

<script setup lang="ts">
import { AuthenticatorAssuranceLevel } from "@ory/client";
import { linkToHrefWithHost } from "@saflib/links";
import {
  FlowGone,
  LoginFlowFetched,
  SecurityCsrfViolation,
} from "@saflib/ory-kratos-sdk";
import { authLinks } from "@saflib/ory-kratos-sdk/links";
import { useReverseT } from "@saflib/ory-kratos-spa/i18n";
import { useLoginLoader } from "./Login.loader.ts";
import { login_mfa_setup_required } from "./Login.strings.ts";
import CsrfViolationPanel from "../common/CsrfViolationPanel.vue";
import FlowGonePanel from "../common/FlowGonePanel.vue";
import UnhandledResponsePanel from "../common/UnhandledResponsePanel.vue";
import LoginFlowForm from "./LoginFlowForm.vue";
import { loginFlowHasVisibleInteractiveNodes } from "./loginFlowUiVisibility.ts";
import { computed, toValue } from "vue";

const { t } = useReverseT();

const { getLoginFlowQuery } = useLoginLoader();

const queryData = computed(() => toValue(getLoginFlowQuery.data));

const flow = computed(() => {
  const d = queryData.value;
  if (d instanceof LoginFlowFetched) {
    return d.flow;
  }
  return null;
});

const showMfaSetupRequired = computed(() => {
  const f = flow.value;
  if (!f) return false;
  if (f.requested_aal !== AuthenticatorAssuranceLevel.Aal2) return false;
  return !loginFlowHasVisibleInteractiveNodes(f.ui.nodes);
});

const settingsHref = computed(() => {
  const f = flow.value;
  const fromFlow =
    typeof f?.return_to === "string" && f.return_to.trim()
      ? f.return_to.trim()
      : undefined;
  const fromWindow =
    typeof window !== "undefined" && window.location.href.trim()
      ? window.location.href
      : undefined;
  const rt = fromFlow ?? fromWindow;
  if (rt) {
    return linkToHrefWithHost(authLinks.newSettings, {
      params: { return_to: rt, tab: "totp" },
    });
  }
  return linkToHrefWithHost(authLinks.newSettings, {
    params: { tab: "totp" },
  });
});
</script>
