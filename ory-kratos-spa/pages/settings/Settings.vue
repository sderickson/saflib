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
      <v-tab value="sessions">{{ t(tabs.sessions) }}</v-tab>
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
      <v-window-item value="sessions">
        <v-alert
          v-if="sessionsBanner"
          type="error"
          variant="tonal"
          class="mb-4"
          density="comfortable"
          closable
          @click:close="clearSessionsBanner"
        >
          {{ sessionsBanner }}
        </v-alert>
        <div class="d-flex flex-wrap ga-2 mb-4">
          <v-btn
            color="error"
            variant="tonal"
            :disabled="otherSessionsCount === 0"
            :loading="disableMyOtherSessions.isPending.value"
            @click="signOutOtherDevices"
          >
            {{ t(sessionsStrings.sign_out_others) }}
          </v-btn>
        </div>
        <v-card>
          <v-card-text v-if="sessionsTableLoading" class="text-center py-8">
            <v-progress-circular indeterminate color="primary" />
          </v-card-text>
          <v-card-text
            v-else-if="(mySessionsQuery.data.value ?? []).length === 0"
            class="text-medium-emphasis"
          >
            —
          </v-card-text>
          <v-table v-else>
            <thead>
              <tr>
                <th class="text-left">{{ t(sessionsStrings.table_device) }}</th>
                <th class="text-left">{{ t(sessionsStrings.table_ip) }}</th>
                <th class="text-left">
                  {{ t(sessionsStrings.table_signed_in) }}
                </th>
                <th class="text-left">{{ t(sessionsStrings.table_actions) }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in sessionsSorted" :key="row.id">
                <td>
                  <span class="text-body-2">{{ sessionUserAgent(row) }}</span>
                  <v-chip
                    v-if="row.id === currentSessionId"
                    class="ml-2"
                    size="small"
                    color="primary"
                    variant="flat"
                  >
                    {{ t(sessionsStrings.badge_this_device) }}
                  </v-chip>
                </td>
                <td>{{ sessionIp(row) }}</td>
                <td>{{ formatSessionTime(row.authenticated_at) }}</td>
                <td>
                  <v-btn
                    v-if="row.id === currentSessionId"
                    color="error"
                    variant="text"
                    size="small"
                    :loading="browserLogoutPending"
                    @click="signOutThisDevice"
                  >
                    {{ t(sessionsStrings.sign_out_this) }}
                  </v-btn>
                  <v-btn
                    v-else
                    color="error"
                    variant="text"
                    size="small"
                    :loading="
                      disableMySession.isPending.value &&
                      disableMySession.variables.value === row.id
                    "
                    @click="revokeSession(row.id)"
                  >
                    {{ t(sessionsStrings.revoke) }}
                  </v-btn>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
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
import { getTanstackErrorMessage, TanstackError } from "@saflib/sdk";
import { useReverseT } from "@saflib/ory-kratos-spa/i18n";
import type { Session, SettingsFlow, UiText } from "@ory/client";
import {
  BrowserRedirectRequired,
  FlowGone,
  SecurityCsrfViolation,
  SettingsFlowFetched,
  kratosEmailFromSession,
  useDisableMyOtherSessionsMutation,
  useDisableMySessionMutation,
  useKratosMySessions,
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
  settings_sessions as sessionsStrings,
  settings_tabs as tabs,
} from "./Settings.strings.ts";
import { useSettingsFlow } from "./useSettingsFlow.ts";
import { useSettingsLoader } from "./Settings.loader.ts";
import CsrfViolationPanel from "../common/CsrfViolationPanel.vue";
import FlowGonePanel from "../common/FlowGonePanel.vue";
import UnhandledResponsePanel from "../common/UnhandledResponsePanel.vue";
import SettingsAalReauthRedirect from "./SettingsAalReauthRedirect.vue";
import { useKratosBrowserLogout } from "../registration/useKratosBrowserLogout.ts";

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

const tab = ref<"email" | "password" | "totp" | "passkey" | "sessions">(
  "email",
);

const { data: kratosSession, isPending: kratosSessionPending } =
  useKratosSession();
const sessionEmail = computed(() =>
  kratosEmailFromSession(kratosSession.value ?? undefined),
);

const mySessionsEnabled = computed(
  () => !kratosSessionPending.value && kratosSession.value != null,
);
const mySessionsQuery = useKratosMySessions({
  enabled: mySessionsEnabled,
});

const currentSessionId = computed(() => kratosSession.value?.id ?? "");

const sessionsSorted = computed(() => {
  const list = [...(mySessionsQuery.data.value ?? [])];
  const cid = currentSessionId.value;
  list.sort((a, b) => {
    const aFirst = a.id === cid ? 0 : 1;
    const bFirst = b.id === cid ? 0 : 1;
    return aFirst - bFirst;
  });
  return list;
});

const otherSessionsCount = computed(
  () =>
    (mySessionsQuery.data.value ?? []).filter(
      (s) => s.id !== currentSessionId.value,
    ).length,
);

const sessionsTableLoading = computed(
  () =>
    mySessionsEnabled.value &&
    mySessionsQuery.isPending.value &&
    mySessionsQuery.data.value === undefined,
);

const disableMySession = useDisableMySessionMutation();
const disableMyOtherSessions = useDisableMyOtherSessionsMutation();

const sessionsActionError = ref("");

const { pending: browserLogoutPending, startBrowserLogout } =
  useKratosBrowserLogout();

function sessionUserAgent(s: Session): string {
  const devices = s.devices ?? [];
  const d = devices[devices.length - 1] ?? devices[0];
  const ua = d?.user_agent?.trim();
  return ua || "—";
}

function sessionIp(s: Session): string {
  const devices = s.devices ?? [];
  const d = devices[devices.length - 1] ?? devices[0];
  return d?.ip_address?.trim() || "—";
}

function formatSessionTime(iso: string | undefined): string {
  if (!iso?.trim()) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  return new Date(t).toLocaleString();
}

const sessionsBanner = computed(() => {
  if (sessionsActionError.value) return sessionsActionError.value;
  const e = mySessionsQuery.error.value;
  if (e instanceof TanstackError) return getTanstackErrorMessage(e);
  if (e) return t(sessionsStrings.load_failed);
  return "";
});

function clearSessionsBanner() {
  sessionsActionError.value = "";
  void mySessionsQuery.refetch();
}

async function revokeSession(id: string) {
  sessionsActionError.value = "";
  try {
    await disableMySession.mutateAsync(id);
  } catch (e) {
    sessionsActionError.value =
      e instanceof TanstackError
        ? getTanstackErrorMessage(e)
        : t(sessionsStrings.action_failed);
  }
}

async function signOutOtherDevices() {
  sessionsActionError.value = "";
  try {
    await disableMyOtherSessions.mutateAsync();
  } catch (e) {
    sessionsActionError.value =
      e instanceof TanstackError
        ? getTanstackErrorMessage(e)
        : t(sessionsStrings.action_failed);
  }
}

function signOutThisDevice() {
  sessionsActionError.value = "";
  void startBrowserLogout();
}

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

watch(tab, (next, prev) => {
  if (next !== "sessions") {
    sessionsActionError.value = "";
  }
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
