<template>
  <template v-if="queryData instanceof SettingsFlowFetched && flow">
    <SettingsIntro />

    <v-alert
      v-if="showPasswordRecoveryPrompt"
      type="info"
      variant="tonal"
      class="mb-4"
      density="comfortable"
    >
      {{ t(passwordRecoveryStrings.prompt) }}
    </v-alert>

    <v-alert
      v-if="submitError"
      type="error"
      variant="tonal"
      class="mb-4"
      closable
      @click:close="clearSubmitError"
    >
      {{ submitError }}
    </v-alert>

    <v-tabs v-model="tab" class="mb-4" color="primary">
      <v-tab value="email">{{ t(tabs.general) }}</v-tab>
      <v-tab value="password">{{ t(tabs.password) }}</v-tab>
      <v-tab v-if="hasTotpSettings" value="totp">{{ t(tabs.totp) }}</v-tab>
      <v-tab v-if="hasPasskeySettings" value="passkey">{{
        t(tabs.passkey)
      }}</v-tab>
    </v-tabs>

    <v-window v-model="tab">
      <v-window-item value="email">
        <SettingsGroupUi
          :flow="flow"
          group="profile"
          :submitting="submitting"
          id-prefix="settings-profile"
          :message-filter="settingsMessageFilter"
          @submit="submitSettingsForm"
        />
      </v-window-item>
      <v-window-item value="password">
        <SettingsGroupUi
          :flow="flow"
          group="password"
          :submitting="submitting"
          id-prefix="settings-password"
          :message-filter="settingsMessageFilter"
          @submit="submitSettingsForm"
        />
      </v-window-item>
      <v-window-item v-if="hasTotpSettings" value="totp">
        <SettingsGroupUi
          :flow="flow"
          group="totp"
          :submitting="submitting"
          id-prefix="settings-totp"
          :message-filter="settingsMessageFilter"
          @submit="submitSettingsForm"
        />
      </v-window-item>
      <v-window-item v-if="hasPasskeySettings" value="passkey">
        <SettingsGroupUi
          :flow="flow"
          group="passkey"
          :submitting="submitting"
          id-prefix="settings-passkey"
          :message-filter="settingsMessageFilter"
          :identity-passkey-display-fallback="sessionEmail"
          @submit="submitSettingsForm"
        />
      </v-window-item>
    </v-window>
  </template>

  <SettingsAalReauthRedirect
    v-else-if="queryData instanceof BrowserRedirectRequired"
    :redirect-browser-to="queryData.payload.redirect_browser_to"
  />

  <FlowGonePanel
    v-else-if="queryData instanceof FlowGone"
    restart-path="/new-settings"
    :restart-query="settingsRestartQuery"
    :result="queryData"
  />
  <CsrfViolationPanel
    v-else-if="queryData instanceof SecurityCsrfViolation"
    restart-path="/new-settings"
    :restart-query="settingsRestartQuery"
    :result="queryData"
  />
  <UnhandledResponsePanel v-else :result="queryData" />
</template>

<script setup lang="ts">
import { computed, ref, toValue, watch } from "vue";
import { useRoute } from "vue-router";
import { useReverseT } from "@saflib/ory-kratos-spa/i18n";
import type { SettingsFlow, UiText } from "@ory/client";
import {
  BrowserRedirectRequired,
  FlowGone,
  SecurityCsrfViolation,
  SettingsFlowFetched,
  kratosEmailFromSession,
  useKratosSession,
} from "@saflib/ory-kratos-sdk";
import SettingsGroupUi from "./SettingsGroupUi.vue";
import SettingsIntro from "./SettingsIntro.vue";
import type { KratosFlowUiMessageFilterContext } from "../common/kratosUiMessages.ts";
import {
  KRATOS_SETTINGS_PASSWORD_RECOVERY_MESSAGE_ID,
  parseSettingsTabQuery,
  settingsFlowHasPasswordRecoveryMessage,
} from "./Settings.logic.ts";
import {
  settings_password_recovery as passwordRecoveryStrings,
  settings_tabs as tabs,
} from "./Settings.strings.ts";
import { useSettingsFlow } from "./useSettingsFlow.ts";
import { useSettingsLoader } from "./Settings.loader.ts";
import CsrfViolationPanel from "../common/CsrfViolationPanel.vue";
import FlowGonePanel from "../common/FlowGonePanel.vue";
import UnhandledResponsePanel from "../common/UnhandledResponsePanel.vue";
import SettingsAalReauthRedirect from "./SettingsAalReauthRedirect.vue";

const { t } = useReverseT();
const route = useRoute();
const { getSettingsFlowQuery } = useSettingsLoader();

const queryData = computed(() => toValue(getSettingsFlowQuery.data));

const flow = computed((): SettingsFlow | null => {
  const d = queryData.value;
  if (d instanceof SettingsFlowFetched) {
    return d.flow;
  }
  return null;
});

const flowIdForSubmit = computed(() => flow.value?.id ?? "");

const { data: kratosSession } = useKratosSession();
const sessionEmail = computed(() =>
  kratosEmailFromSession(kratosSession.value ?? undefined),
);

const { submitting, submitError, clearSubmitError, submitSettingsForm } =
  useSettingsFlow(flowIdForSubmit);

/** Hide stale Kratos flow-level banners (e.g. “saved”) after switching tabs; cleared when a submit finishes. */
const suppressFlowLevelKratosMessages = ref(false);

const hasTotpSettings = computed(() =>
  Boolean(flow.value?.ui.nodes.some((node) => node.group === "totp")),
);

const hasPasskeySettings = computed(() =>
  Boolean(flow.value?.ui.nodes.some((node) => node.group === "passkey")),
);

const showPasswordRecoveryPrompt = computed(() =>
  flow.value ? settingsFlowHasPasswordRecoveryMessage(flow.value) : false,
);

const settingsMessageFilter = computed(
  (): ((msg: UiText, ctx: KratosFlowUiMessageFilterContext) => boolean) => {
    return (msg, ctx) => {
      if (
        ctx.kind === "flow" &&
        Number(msg.id) === KRATOS_SETTINGS_PASSWORD_RECOVERY_MESSAGE_ID
      ) {
        return false;
      }
      if (ctx.kind === "flow" && suppressFlowLevelKratosMessages.value) {
        return false;
      }
      return true;
    };
  },
);

const tab = ref<"email" | "password" | "totp" | "passkey">("email");

watch(
  [flow, () => route.query.tab, hasTotpSettings, hasPasskeySettings],
  () => {
    const f = flow.value;
    if (f && settingsFlowHasPasswordRecoveryMessage(f)) {
      tab.value = "password";
      return;
    }
    const fromQuery = parseSettingsTabQuery(route.query.tab);
    if (!fromQuery) return;
    if (fromQuery === "totp" && !hasTotpSettings.value) return;
    if (fromQuery === "passkey" && !hasPasskeySettings.value) return;
    tab.value = fromQuery;
  },
  { immediate: true },
);

watch(tab, (_next, prev) => {
  if (prev !== undefined) {
    suppressFlowLevelKratosMessages.value = true;
  }
});

watch(submitting, (now, was) => {
  if (was && !now) {
    suppressFlowLevelKratosMessages.value = false;
  }
});

/** Preserve `return_to` when restarting from CSRF or expired flow. */
const settingsRestartQuery = computed(() => {
  const q: Record<string, string> = {};
  if (
    typeof route.query.return_to === "string" &&
    route.query.return_to.trim()
  ) {
    q.return_to = route.query.return_to.trim();
  }
  const tabQ = parseSettingsTabQuery(route.query.tab);
  if (tabQ) {
    q.tab = tabQ;
  }
  return q;
});
</script>
